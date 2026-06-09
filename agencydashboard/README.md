# Labourlink — Agency Dashboard

The web portal where labour-hire agencies manage their roster of labourers and
keep their bench billable. Desktop-first, editorial/premium UI matching the
Labourlink mobile app.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS v4**. Deployable to
Vercel. Self-contained — it has its own `package.json`, `node_modules`,
`tsconfig.json` and `next.config.ts` and is fully isolated from the Expo app in
the repo root.

---

## Quick start

```bash
cd agencydashboard
npm install
npm run dev
```

Then open the printed URL (http://localhost:3000, or the next free port).

```bash
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```

> Requires Node 20.9+ (Next.js 16 minimum).

---

## Environment

| Variable                   | Default                                | Purpose                            |
| -------------------------- | -------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://labourlink-olqr.onrender.com` | Base URL of the Labourlink backend |

Copy `.env.example` to `.env.local` to override:

```bash
cp .env.example .env.local
```

The var is read in [`src/lib/api.ts`](src/lib/api.ts) as `BASE`. **It isn't used
yet** — every screen runs on mock data because the backend's agency role and
endpoints don't exist (see below).

---

## Project structure

```
agencydashboard/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # root layout (metadata, <html>)
│  │  ├─ page.tsx                # / → redirects to /overview
│  │  ├─ globals.css             # design tokens (@theme) + base styles
│  │  ├─ login/page.tsx          # stub agency login (TODO: real auth)
│  │  └─ (dashboard)/            # everything behind the app shell
│  │     ├─ layout.tsx           # persistent sidebar + topbar
│  │     ├─ overview/            # hero: KPIs + roster + "needs attention"
│  │     ├─ roster/              # full table + filters
│  │     │  ├─ [id]/             # labourer detail (view + inline edit)
│  │     │  └─ new/              # add labourer
│  │     ├─ offers/              # incoming offers → accept & assign labourer
│  │     ├─ jobs/                # active placements + "coming free soon"
│  │     ├─ billing/             # plan, seat meter, comparison, invoices
│  │     └─ settings/            # agency profile + public "via [Agency]" identity
│  ├─ components/
│  │  ├─ ui.tsx                  # Card, Button, Input, Chip, Avatar, …
│  │  ├─ icons.tsx               # inline SVG icon set (no icon dependency)
│  │  ├─ Sidebar.tsx             # nav + pinned plan/seat-meter card
│  │  ├─ Topbar.tsx              # page title + agency identity
│  │  ├─ StatusBadge.tsx         # functional sage/amber/beige status pill
│  │  ├─ AvailabilityDots.tsx    # weekly M T W T F S S pattern
│  │  ├─ RosterTable.tsx         # shared roster table (Overview + Roster)
│  │  └─ LabourerForm.tsx        # add/edit profile, tickets, availability
│  └─ lib/
│     ├─ types.ts                # ⭐ single source of truth for the data model
│     ├─ api.ts                  # ⭐ typed API contract (mock-backed for now)
│     ├─ mock.ts                 # realistic seed data
│     ├─ utils.ts                # status meta, formatting, "attention" derivations
│     └─ useAsync.ts             # tiny client data-fetching hook
├─ .env.example
└─ next.config.ts               # turbopack.root pinned to this folder
```

---

## Screens

| Route          | What it does                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `/overview`    | Hero. Greeting, KPI cards (On a job / On the bench — outlined hero / Unavailable / Total), roster table, "Needs your attention" panel. |
| `/roster`      | Full managed-labourer table with search + status + trade filters; rows → detail.                  |
| `/roster/[id]` | Labourer detail: profile, current placement, skills, availability, tickets/cert expiry, notes. Inline **Edit details**. |
| `/roster/new`  | Add a labourer (the agency owns the profile — no labourer login).                                 |
| `/offers`      | Incoming offers from builders. Accept → **assign a specific labourer** (flips them to *On a job*), or decline. |
| `/jobs`        | Active placements: who's where, end dates, and who comes free next.                               |
| `/billing`     | Current tier, seat usage meter, plan comparison, invoice list (mock).                             |
| `/settings`    | Agency company details + the public "via [Agency]" identity.                                      |
| `/login`       | Stub agency login.                                                                                |

---

## Design system

Mirrors the mobile app's "Twoflo" visual system. Tokens live in
[`src/app/globals.css`](src/app/globals.css) under Tailwind v4's `@theme`, so
they're usable as utilities (`bg-bg`, `text-ink`, `bg-sage`, …).

- **Surfaces** — `bg` cream `#F2EDE3`, `surface` `#ECE5D4`, `field` `#FAF6EC`,
  `line` (hairline borders) `#D0C8B6`.
- **Text / primary** — `ink` `#1F1F1F`, `muted` `#6B6B6B`.
- **Status (functional)** — `sage` = on a job / approved, `amber` = bench /
  applied, `beige` = off / unavailable. Each has a `-ink` text pair.
- **`brand-yellow` `#FDE047`** — brand highlight ONLY (the wordmark accent).
  Never used as body text on cream or as a status colour (contrast/AA).
- Helvetica Neue, 800-weight headings with tight tracking, small uppercase
  eyebrow labels, flat hairline borders, no heavy shadows, generous whitespace.

Accessibility: semantic HTML, visible `:focus-visible` rings, AA-contrast colour
pairs, and `aria` on progress bars / nav / dialogs.

---

## Data layer — mock today, real API later

The backend's agency role + endpoints **do not exist yet**, so:

- [`src/lib/types.ts`](src/lib/types.ts) holds the entire data model in one place
  (designed to lift into a shared package later).
- [`src/lib/api.ts`](src/lib/api.ts) defines the **typed agency endpoint
  contract** — `getRoster`, `getLabourer`, `upsertLabourer`, `deleteLabourer`,
  `getOffers`, `assignOffer`, `declineOffer`, `getJobs`, `getBilling`,
  `getAgency`, `updateAgency`, `login`. Each is currently backed by an in-memory
  mock store (so add-labourer / assign-offer mutations persist for the page
  session) and carries a `// TODO(api):` comment with the exact `fetch` to drop in.

### TODO: mock → real API

When the backend ships the agency role, replace each method body in
`src/lib/api.ts` (search `TODO(api):`):

- [ ] `getRoster` → `GET ${BASE}/agency/labourers`
- [ ] `getLabourer` → `GET ${BASE}/agency/labourers/:id`
- [ ] `upsertLabourer` → `POST` / `PUT ${BASE}/agency/labourers/:id`
- [ ] `deleteLabourer` → `DELETE ${BASE}/agency/labourers/:id`
- [ ] `getOffers` → `GET ${BASE}/agency/offers`
- [ ] `assignOffer` → `POST ${BASE}/agency/offers/:id/assign` `{ labourerId }`
- [ ] `declineOffer` → `POST ${BASE}/agency/offers/:id/decline`
- [ ] `getJobs` → `GET ${BASE}/agency/placements`
- [ ] `getBilling` → `GET ${BASE}/agency/billing`
- [ ] `getAgency` / `updateAgency` → `GET` / `PUT ${BASE}/agency/profile`
- [ ] **Auth** (`src/lib/api.ts` `login` + `src/app/login/page.tsx`) — wire to
      real agency auth, persist the session/token, and guard the `(dashboard)`
      routes. Search `TODO(auth):`.
- [ ] Once real, delete `src/lib/mock.ts` and the mock store in `api.ts`.

---

## Deploying to Vercel

Set the project root to `agencydashboard`, add `NEXT_PUBLIC_API_BASE_URL`, and
deploy — no other configuration needed.
