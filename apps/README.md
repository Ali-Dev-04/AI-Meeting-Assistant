# apps/

Deployable applications. Each is an independently buildable package within the
pnpm workspace.

| App | Stack | Responsibility | Phase |
|-----|-------|----------------|-------|
| `web/` | Next.js + React + TS + Tailwind + shadcn/ui | User-facing UI: upload, transcript, search, chat, billing | Phase 8 |
| `api/` | NestJS + Prisma | Public REST API: auth, CRUD, quota, search/chat orchestration, job enqueue | Phase 9 |
| `worker/` | NestJS (worker mode) + BullMQ | Async AI pipeline: transcode → transcribe → summarize → embed | Phase 9 |

## Internal layout (each app, once built)

```
apps/<app>/
├── src/
│   ├── <feature>/        # feature modules (NestJS) / routes+components (Next.js)
│   └── main.ts           # entrypoint
├── tests/                # unit / integration / e2e
├── package.json
├── tsconfig.json
└── README.md
```

> See `docs/REPOSITORY_STRUCTURE.md` for the complete, explained tree.
