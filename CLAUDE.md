# RentMonitoring — Project Rules

PropTech SaaS: interactive SVG floor-plan map of commercial rental space. Full spec: [ТЗ.md](ТЗ.md).

Monorepo (pnpm workspaces): `apps/web` (Nuxt 4), `apps/api` (NestJS 11). Node >= 22, pnpm.

---

## 1. Mandated libraries — ALWAYS use these, never substitute

Do NOT introduce an alternative to anything below without explicit user approval. No `axios` if we have native `$fetch`, no `moment`, no `class-validator`, no Webpack configs, etc.

### Backend (`apps/api`)
| Concern | Library | Rule |
|---|---|---|
| Framework | **NestJS 11** | TypeScript, modular. Use `import`, not `require()`. |
| ORM / DB | **Prisma 7** + PostgreSQL 16 | All DB access via `PrismaService`. Never raw `pg`/`knex`. Multi-write = `prisma.$transaction`. |
| Validation | **Zod** (Standard Schema pipes) | NO `class-validator` / `class-transformer`. Validate every controller input with a Zod schema pipe. |
| Cron / jobs | **@nestjs/schedule** | All workers as `@Cron(...)` methods, one task per method, isolated. |
| Config | **@nestjs/config** + Zod-validated env | No `process.env.X` scattered in code — read through config service. |

### Frontend (`apps/web`)
| Concern | Library | Rule |
|---|---|---|
| Framework | **Nuxt 4** (Vue 3, `<script setup lang="ts">`) | Composition API only. No Options API. |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`) | No inline `style=` except dynamic SVG transforms. No CSS modules. |
| Components | **shadcn-vue** (Radix Vue) | Reuse generated components. Don't hand-roll modals/sheets/tooltips. |
| Pan & Zoom | **vue-zoom-pan-pinch** (or `@panzoom/panzoom`) | Use for the canvas. MUST clean up listeners on floor switch (memory leak QA item). |
| Data fetch | Nuxt native **`$fetch` / `useFetch`** | No `axios`. |

---

## 2. Hard architecture rules (from ТЗ — "чтобы не было проёбов")

1. **Coordinates are fractions, never pixels.** Store/transmit polygon points as relative `0.0000–1.0000` (`x = offsetX / naturalWidth`). SVG renders with `viewBox="0 0 1000 1000"`. Never persist `px`.
2. **Performance:** pure SVG for floors ≤150 rooms (`content-visibility:auto`, `will-change:transform`); Leaflet `L.imageOverlay` only for 500+ rooms.
3. **Atomicity:** status transitions that touch multiple rows (e.g. contract delete → room `FREE`) run in one `prisma.$transaction`.
4. **Money:** rent/amounts use Prisma `Decimal` — never JS `number` for currency math.
5. **Status enums** are the source of truth: `RoomStatus`, `InvoiceStatus`. Frontend reads `data-status` for styling, never hardcodes colors per room.

---

## 3. Post-edit review — MANDATORY after every changed file

After writing or editing ANY source file, immediately run a review of that file before moving on. No batching "I'll review at the end."

**How:** delegate the changed file to the `cavecrew-reviewer` subagent (one line per finding, severity-tagged), OR self-review against this checklist:

- [ ] No mandated-library violation (section 1).
- [ ] No architecture rule broken (section 2) — esp. px coords, Decimal money, transactions.
- [ ] Types explicit, no `any`. No `@ts-ignore` without a reason comment.
- [ ] No dead code, no commented-out blocks, no `console.log` left in.
- [ ] Errors handled, not swallowed. No empty `catch`.
- [ ] Names say what they do. Functions do one thing.
- [ ] No secrets / hardcoded URLs / keys — use config + env.

Any 🔴/🟠 finding gets fixed in the same turn, then re-reviewed. Only then move to the next file. Goal: zero shit code lands.

---

## 4. Stack gotchas (hard-won — don't re-trip)

- **Prisma 7 has no Rust engine.** `new PrismaClient()` throws without a driver adapter. `PrismaService` constructs with `new PrismaPg({ connectionString })`. Generator uses `moduleFormat = "cjs"` + `runtime = "nodejs"` (default ESM output emits `import.meta`, which Nest's CJS build can't run).
- **apps/api is `"type": "commonjs"`** — must be explicit, else it inherits the root `"type": "module"` and the compiled CJS client breaks. Build output lands in `dist/src/main.js` (the `generated/` dir shifts tsc rootDir), so `start:prod` points there.
- **Browser-only libs (`@panzoom/panzoom`) must be dynamic-imported in `onMounted`.** It's CJS with no `default` export under Nitro SSR — a top-level `import` 500s the SSR render. Map renders static on server, panzoom hydrates on client.
- **Local Postgres** via root `docker-compose.yml` (`docker compose up -d`). `apps/api/.env` holds `DATABASE_URL`; run API/seed with cwd = `apps/api` so `.env` loads. Dev port 3000 may be taken by another project — pick a free port when smoke-testing.

## 5. Workflow conventions

- Package manager: **pnpm** only. Run cmds via `pnpm --filter @rent/web ...` / `@rent/api`.
- TypeScript strict everywhere. `pnpm typecheck` must pass before declaring done.
- Conventional Commits. Don't commit unless asked.
- Secrets live in `.env` (gitignored); keep `.env.example` current.
