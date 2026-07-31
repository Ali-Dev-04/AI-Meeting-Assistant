# API Design

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 6 — Draft, pending approval  |
| Date      | 2026-07-22                         |
| Depends on| PRD.md, architecture.md, database.md |
| Phase     | 6 of 18 — API Design               |

This document is the human-readable API contract. The machine-readable **OpenAPI 3.1** spec is
**generated from code** by `nestjs/swagger` in Phase 9 (see §10 for why), served at `/api/docs`
(Swagger UI) and `/api/docs-json`.

---

## 1. Conventions

| Concern | Decision |
|---------|----------|
| **Base URL** | `/api/v1` — URI versioning. Breaking changes bump `v2`; v1 stays available during migration. |
| **Content type** | `application/json; charset=utf-8` for bodies; `multipart/form-data` only where noted. |
| **Auth** | `Authorization: Bearer <accessToken>` (JWT, short-lived). |
| **Idempotency** | `Idempotency-Key` header on create-operations that may be retried (upload-complete, checkout). The API caches the response for that key for 24h. |
| **Time** | All timestamps are ISO-8601 UTC (`2026-07-22T14:30:00Z`). |
| **IDs** | UUID v4 strings. |
| **Casing** | `camelCase` for JSON field names (matches TS conventions). |
| **CORS** | Strict allowlist from `CORS_ORIGINS`; credentials supported for the refresh-token cookie. |
| **Security headers** | `Helmet` defaults: HSTS, no-sniff, frame-ancestors, CSP on the API where applicable. |

---

## 2. Authentication & Authorization

### Token model
- **Access token:** JWT, 15 min TTL, sent in `Authorization: Bearer`. Stateless — verified by signature.
- **Refresh token:** opaque, 7-day TTL, stored hashed in a **Redis whitelist**; rotated on every
  use (old token invalidated). Revocable (logout, password change, admin force-logout).
- *Why rotation + whitelist?* If an access token is stolen, it self-expires in 15 min. If a refresh
  token is stolen, rotation detects reuse (the stolen token is invalidated next rotation) and the
  whitelist lets us revoke instantly.

### Guard pipeline (every protected request)
```
JwtAuthGuard          → verifies access token, loads User
  → WorkspaceGuard    → resolves workspaceId from route/header, confirms membership
    → RoleGuard       → checks role against required minimum (OWNER/ADMIN/MEMBER)
      → ResourceGuard → ownership/scoping check (e.g., "this meeting belongs to my workspace")
```
Each layer fails closed (deny by default). Public routes (`/auth/login`, `/share/:token`,
`/billing/webhook`) skip auth but apply their own checks (e.g., Stripe signature verification).

### Roles & permissions (matrix)
| Capability | Member | Admin | Owner |
|-----------|:------:|:-----:|:-----:|
| View meetings | ✅ | ✅ | ✅ |
| Upload meeting | ✅ | ✅ | ✅ |
| Edit/delete own meeting | ✅ | ✅ | ✅ |
| Delete others' meeting | ❌ | ✅ | ✅ |
| Manage members / roles | ❌ | ✅ | ✅ |
| Manage billing / plan | ❌ | ❌ | ✅ |
| Delete workspace | ❌ | ❌ | ✅ |

---

## 3. Response & Listing Standards

### Envelope
- **Success:** the resource directly, or `{ items, nextCursor, hasMore }` for lists.
- **Error:** see §4.
- We return resources flat (not wrapped in `{ data: ... }`) to keep payloads lean; the list
  envelope carries paging metadata.

### Pagination — **cursor-based** (default)
```
GET /meetings?limit=20&cursor=eyJpZCI6...
→ 200 { items: [...], nextCursor: "eyJ...", hasMore: true }
```
- *Why cursor, not offset?* Offset pagination re-scans and skips rows as new data inserts
  (duplicate/missing items under concurrency), and gets slower deep into results. A cursor
  (encoding `occurredAt + id`) is stable and consistently fast. Trade-off: no "jump to page 47" —
  acceptable; our UIs are infinite-scroll/search-oriented.
- `limit` capped (e.g., max 100); default 20.

### Filtering & sorting
- Filters are query params: `?status=ready&from=2026-01-01&to=2026-06-30&participant=...`.
- Sort: `?sort=-occurredAt` (`-` = descending). Multi-sort: `?sort=-occurredAt,title`.

---

## 4. Error Handling

Every error uses one envelope so clients can parse uniformly:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "email", "issue": "must be a valid email" }
    ],
    "requestId": "req_01HXYZ..."
  }
}
```

| Status | Code | Meaning |
|-------|------|---------|
| 400 | `BAD_REQUEST` | Malformed request (can't be validated). |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired token. |
| 403 | `FORBIDDEN` | Authenticated but not allowed (role/ownership). |
| 404 | `NOT_FOUND` | Resource doesn't exist or isn't in this workspace. |
| 409 | `CONFLICT` | Duplicate (e.g., email already used). |
| 422 | `VALIDATION_ERROR` | Semantically invalid (field-level `details`). |
| 429 | `RATE_LIMITED` | Too many requests. |
| 500 | `INTERNAL` | Unexpected server error (logged with `requestId`). |
| 503 | `SERVICE_UNAVAILABLE` | Downstream dependency down (DB/Redis/AI). |

- **Never leak internals** (stack traces, SQL) in production — only `message` + `requestId`.
- `requestId` is generated per request and echoed in logs + errors so support can trace a failure.

---

## 5. Rate Limiting

- Sliding-window counters in Redis, keyed by user-id (authenticated) and IP (unauthenticated).
- Tiers: tighter on `/auth/*` (brute-force protection) and AI endpoints (cost control); generous on
  reads.
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Exceeding returns `429` with `Retry-After`.

---

## 6. Endpoints

> `🔒` = authenticated. Roles shown where restricted. `202` = accepted for async processing.

### 6.1 Auth
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/auth/register` | Register; sends verification email | — |
| POST | `/auth/verify-email` | Verify email via token | — |
| POST | `/auth/login` | Exchange credentials → tokens | — |
| POST | `/auth/refresh` | Rotate refresh → new token pair | (refresh token) |
| POST | `/auth/logout` | Revoke refresh token | 🔒 |
| POST | `/auth/forgot-password` | Send reset email | — |
| POST | `/auth/reset-password` | Reset via token | — |
| GET | `/auth/me` | Current user + memberships | 🔒 |
| POST | `/auth/oauth/google` | Google sign-in | — |

### 6.2 Users
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| PATCH | `/users/me` | Update profile (name, avatar) | 🔒 |
| PATCH | `/users/me/password` | Change password | 🔒 |
| DELETE | `/users/me` | Soft-delete account | 🔒 |

### 6.3 Workspaces & Membership
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/workspaces` | Create workspace (creator = Owner) | 🔒 |
| GET | `/workspaces` | List my workspaces | 🔒 |
| GET | `/workspaces/:id` | Workspace details + plan | 🔒 Member+ |
| PATCH | `/workspaces/:id` | Rename / settings | 🔒 Admin+ |
| DELETE | `/workspaces/:id` | Delete workspace | 🔒 Owner |
| GET | `/workspaces/:id/members` | List members | 🔒 Member+ |
| PATCH | `/workspaces/:id/members/:userId` | Change member role | 🔒 Admin+ |
| DELETE | `/workspaces/:id/members/:userId` | Remove member | 🔒 Admin+ |
| POST | `/workspaces/:id/invitations` | Invite by email | 🔒 Admin+ |
| GET | `/workspaces/:id/invitations` | List invitations | 🔒 Admin+ |
| POST | `/workspaces/:id/leave` | Leave workspace | 🔒 Member+ |

### 6.4 Invitations (accept flow)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/invitations/:token` | Preview invite (workspace, role) | — |
| POST | `/invitations/:token/accept` | Accept → join workspace | 🔒 |

### 6.5 Meetings & processing ⭐
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/meetings` | Create meeting + get presigned upload URL | 🔒 Member+ |
| POST | `/meetings/:id/complete` | Mark upload done → enqueue processing | 🔒 Member+ |
| GET | `/meetings` | List/search (filter, sort, cursor) | 🔒 Member+ |
| GET | `/meetings/:id` | Meeting detail + status | 🔒 Member+ |
| PATCH | `/meetings/:id` | Edit title/time | 🔒 Member+ (owner) |
| DELETE | `/meetings/:id` | Soft-delete | 🔒 Member+ (owner/admin) |
| GET | `/meetings/:id/status` | Lightweight processing status (polling/SSE) | 🔒 Member+ |
| GET | `/meetings/:id/transcript` | Segments + speaker turns | 🔒 Member+ |
| GET | `/meetings/:id/summary` | Summary + key points | 🔒 Member+ |
| POST | `/meetings/:id/summary/regenerate` | Re-run AI summary | 🔒 Member+ (owner) |
| GET | `/meetings/:id/action-items` | Action items | 🔒 Member+ |
| PATCH | `/meetings/:id/action-items/:itemId` | Update status (open/done/dismissed) | 🔒 Member+ |
| GET | `/meetings/:id/decisions` | Decisions | 🔒 Member+ |
| GET | `/meetings/:id/topics` | Topic outline | 🔒 Member+ |

### 6.6 Search
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/search?q=&mode=hybrid&...` | Keyword / semantic / hybrid search across workspace | 🔒 Member+ |

### 6.7 Meeting chat (RAG)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/meetings/:id/chat/conversations` | Start a conversation | 🔒 Member+ |
| GET | `/meetings/:id/chat/conversations` | List my conversations | 🔒 Member+ |
| GET | `/meetings/:id/chat/conversations/:convId/messages` | Message history | 🔒 Member+ |
| POST | `/meetings/:id/chat/conversations/:convId/messages` | Ask; **SSE** stream of answer + citations | 🔒 Member+ |

### 6.8 Collaboration
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/meetings/:id/share-links` | Create share link (role, expiry) | 🔒 Member+ |
| GET | `/meetings/:id/share-links` | List links | 🔒 Member+ |
| DELETE | `/share-links/:id` | Revoke link | 🔒 Member+ (owner/admin) |
| GET | `/share/:token` | Public read (scoped by link role) | — |
| GET | `/meetings/:id/comments` | List comments/highlights | 🔒 Member+ |
| POST | `/meetings/:id/comments` | Add comment/highlight | 🔒 Member+ |
| PATCH | `/comments/:id` | Edit comment | 🔒 (author) |
| DELETE | `/comments/:id` | Delete comment | 🔒 (author/admin) |

### 6.9 Billing & usage
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/billing/plans` | Plans + limits | 🔒 |
| GET | `/billing/usage` | Current-period usage vs limits | 🔒 Member+ |
| POST | `/billing/checkout` | Start Stripe Checkout → URL | 🔒 Owner |
| POST | `/billing/portal` | Stripe customer-portal URL | 🔒 Owner |
| POST | `/billing/webhook` | Stripe webhook (signature-verified) | — (HMAC) |

### 6.10 Notifications & health
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/notifications` | List (cursor) | 🔒 |
| PATCH | `/notifications/:id/read` | Mark read | 🔒 |
| POST | `/notifications/read-all` | Mark all read | 🔒 |
| GET | `/health` | Liveness | — |
| GET | `/health/ready` | Readiness (DB + Redis) | — |

---

## 7. File Upload — Presigned-URL Pattern ⭐

Uploading multi-hundred-MB media **through** the API would tie up a request, buffer the file, and
fail on large uploads. Instead we use **direct-to-storage** uploads:

```
1. Client → POST /meetings { title, filename, mimeType, sizeBytes }
   ← 201 { id, uploadUrl (presigned S3 PUT), headers }
2. Client → PUT uploadUrl  <binary>     (goes straight to S3, not the API)
3. Client → POST /meetings/:id/complete   (Idempotency-Key)
   ← 202 { id, status: "QUEUED" }        (worker picks up the job)
```
- **Validation before processing:** MIME + size checked at step 1 (magic-bytes, not just
  extension); quota checked before issuing the URL.
- **Why `202 Accepted`:** processing is async — the API confirms the job is queued, not done. The
  client polls `GET /meetings/:id/status` (or subscribes via SSE) until `READY`.
- *Alternative considered:* multipart through the API (rejected — proxies large files, limited to
  request size/timeouts); resumable multipart upload via S3 (adopted later for very large files).

---

## 8. Streaming Chat (SSE)

`POST /meetings/:id/chat/conversations/:convId/messages` returns `text/event-stream`:

```
event: token      data: {"delta":"Based on "}
event: token      data: {"delta":"the meeting..."}
event: citations  data: {"segments":["seg_01","seg_03"]}
event: done       data: {"messageId":"msg_..."}
```
- *Why SSE, not WebSocket?* Chat is server→client streaming of a single response; SSE is simpler,
  works over plain HTTP, auto-reconnects, and needs no connection management. WebSockets are
  reserved for future real-time collaboration (Phase: roadmap).
- The assistant retrieves relevant chunks (RAG), streams Claude's output token-by-token, then
  emits citations so the UI can render source links.

---

## 9. Validation

- **DTOs** at the controller boundary define the contract (TypeScript + Zod/class-validator).
- Invalid JSON → `400`; valid JSON failing rules → `422` with field-level `details`.
- Strings trimmed/normalized; enums validated; UUIDs pattern-checked; sizes bounded.
- **Shared schemas:** the same Zod schemas live in `packages/shared-types`, so the frontend
  validates identically before even hitting the API.

---

## 10. OpenAPI / Swagger

### Approach: **generate from code**
We annotate NestJS controllers/DTOs (`@ApiTags`, `@ApiOperation`, `@ApiResponse`,
`@ApiProperty`) and `nestjs/swagger` emits the OpenAPI 3.1 spec at build/runtime.

- **Why not hand-write `openapi.yaml`?** A hand-maintained spec **drifts** from the code the
  moment someone changes a DTO and forgets the YAML. A generated spec is the *single source of
  truth* — the code is the spec. This is the industry default.
- **Consumers:** Swagger UI at `/api/docs` for interactive testing; `openapi.json` for codegen
  (typed clients for the frontend) and contract testing in CI.

### Sample (POST /meetings) — OpenAPI 3.1 excerpt

```yaml
openapi: 3.1.0
info:
  title: AI Meeting Assistant API
  version: "1.0"
servers:
  - url: https://api.example.com/api/v1
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    CreateMeetingRequest:
      type: object
      required: [title, filename, mimeType, sizeBytes]
      properties:
        title: { type: string, minLength: 1, maxLength: 200 }
        filename: { type: string }
        mimeType: { type: string, enum: [audio/wav, audio/mpeg, audio/mp4, video/mp4] }
        sizeBytes: { type: integer, format: int64, minimum: 1, maximum: 2147483648 }
    Meeting:
      type: object
      properties:
        id: { type: string, format: uuid }
        title: { type: string }
        status: { type: string, enum: [QUEUED, TRANSCRIBING, SUMMARIZING, INDEXING, READY, FAILED] }
        createdAt: { type: string, format: date-time }
    Error:
      type: object
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: array, items: { type: object } }
            requestId: { type: string }
paths:
  /meetings:
    post:
      tags: [Meetings]
      summary: Create a meeting and get a presigned upload URL
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateMeetingRequest' }
      responses:
        '201':
          description: Meeting created with presigned upload URL
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string, format: uuid }
                  uploadUrl: { type: string, format: uri }
                  headers: { type: object }
        '422': { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '402': { description: Quota exceeded }
```

---

## 11. Open Questions (before Phase 7)

1. **Pagination:** confirm cursor-based as default (recommended) — or do any lists need offset/page numbers?
2. **Chat transport:** SSE streaming (recommended) — or return the full answer in one JSON response for v1 simplicity?
3. **Upload:** presigned-URL direct-to-S3 (recommended) — or simpler multipart-through-API for v1?

---

*End of Phase 6 deliverable. Approval required before Phase 7 (UI/UX Planning).*
