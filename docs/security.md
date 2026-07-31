# Security

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 12 — Draft, pending approval |
| Date      | 2026-07-23                         |
| Phase     | 12 of 18 — Security                |

Defense in depth: security is built into each layer, not bolted on. This doc maps every control to
the threat it mitigates, aligned to **OWASP ASVS L1** (our pre-launch baseline).

---

## 1. Authentication & Session

| Control | Implementation | Mitigates |
|---------|----------------|-----------|
| Password hashing | bcrypt cost 12 | Stolen-DB credential cracking |
| JWT access token (15m, signed) | `JwtStrategy`, in-memory client-side | Long-lived token theft |
| Refresh token rotation + Redis whitelist | hashed (sha256), single-use | Token replay; stolen-refresh persistence |
| Anti-enumeration | identical login error for bad user/pwd | Account enumeration |
| Cookie hardening | `httpOnly`, `secure` (prod), `sameSite=lax`, path-scoped | XSS token theft, CSRF |

> **CSRF analysis.** Auth uses `Authorization: Bearer` (not cookies), so classic CSRF doesn't apply.
> The only cookie is the refresh token, which is `httpOnly` + `sameSite=lax` and only accepted by
> `/api/v1/auth/*` POST handlers that *rotate* it — so a forged cross-site request can't authenticate
> an action. If we ever move to cookie-based sessions, we add double-submit tokens.

## 2. Authorization

| Control | Implementation |
|---------|----------------|
| Secure-by-default routes | Global `JwtAuthGuard`; `@Public()` opts out |
| Role checks | Owner/Admin/Member enforced per endpoint |
| Tenant isolation | Every query scoped by `workspace_id` |
| Cross-tenant = 404 | Never reveals a resource exists to an outsider |

## 3. Input validation & injection

- **Validation:** every payload validated by **Zod** at the controller boundary (shared schemas) →
  `422 VALIDATION_ERROR` with field details. Unknown keys stripped (`ValidationPipe whitelist`).
- **SQL injection:** all DB access via **Prisma** (parameterized). Raw queries (`$queryRaw`/
  `$executeRaw`) use the **tagged-template** form, which parameterizes every interpolation —
  including the `::vector` literals. No string-concatenated SQL anywhere.
- **NoSQL/ORM mass-assignment:** Prisma uses explicit `data` shapes; no untrusted object spreads.

## 4. XSS & output

- The API returns **JSON only** (no server-rendered HTML), so stored XSS via meeting content can't
  execute in our domain; the React frontend **auto-escapes** by default.
- `helmet` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security`,
  and a restrictive CSP baseline.

## 5. Rate limiting & abuse

- **Throttler** (global guard): 120 req/min default; **10/min on register/login** (brute-force),
  30/min on refresh. Returns `429` with `Retry-After`.
- *Scale note:* the default store is in-memory; for multi-instance prod, bind a Redis-backed
  `ThrottlerStorage` (same interface) so limits are shared across instances.
- File-upload abuse: MIME + size validated server-side (magic-bytes in Phase 12 hardening),
  and quotas cap volume per plan.

## 6. Secrets management

- **All** config flows through `config/env.ts`, which zod-validates on boot and **exits** if a
  required secret is missing — no silent misconfiguration.
- `.env` is gitignored; `.env.example` documents required vars. Production uses the platform's
  secret store (Railway/AWS Secrets Manager), never committed files.
- JWT secrets must be ≥16 chars (enforced). Stripe/Anthropic keys are optional and only loaded if set.

## 7. Transport & headers

- TLS in production (platform-terminated). `helmet` for security headers. CORS is a strict
  allowlist from `CORS_ORIGINS` with credentials (no wildcard origin).

## 8. Data protection & privacy

- Tenant isolation (above) is the core data-control.
- **Soft deletes** preserve audit history and enable GDPR-style export/erasure (retention controls).
- Recording-consent: a consent indicator + ToS are product-level controls (PRD §12); the system
  never auto-records without the future bot's explicit join.

## 9. Dependency & supply chain

- `pnpm` lockfile committed; `pnpm audit`/OSV in CI; Renovate/Dependabot for updates.
- No new dependency without justification (license + maintenance check).

## 10. Threat model (STRIDE summary)

| Threat | Example | Control |
|--------|---------|---------|
| **Spoofing** | Stolen password | bcrypt + optional 2FA (roadmap) |
| **Tampering** | Modify another's meeting | Tenant isolation + role checks |
| **Repudiation** | "I didn't delete it" | `audit_logs` (Phase 5 schema) |
| **Information disclosure** | Cross-tenant read | 404-on-cross-tenant; parameterized SQL |
| **Denial of service** | Brute-force / flood | Throttler + quotas + async jobs |
| **Elevation of privilege** | Member → Admin | Role guards on sensitive endpoints |

## 11. Roadmap (post-v1)

SSO/SAML, SOC 2 controls, data-residency regions, optional 2FA, Redis-backed throttle storage,
automated secret rotation.

---

*End of Phase 12 deliverable. Approval required before Phase 13 (Performance Optimization).*
