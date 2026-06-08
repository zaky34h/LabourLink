# LabourLink — Security Audit

**Scope:** React Native / Expo client (`app/`, `src/`) and Node `http` backend (`backend/server.js`), plus repo hygiene, dependency vulnerabilities, route/role enforcement and PII handling.
**Type:** Read-only review. No code was changed.
**Date:** 2026-06-08
**Auditor:** Automated review (Claude)

---

## Summary

The backend is, in most respects, built with good security hygiene: opaque server-side
session tokens, `scrypt` password hashing, per-IP/per-email rate limiting, real Apple/Google
token signature verification, security response headers, HTTPS enforcement in production, a
request-body size cap, and consistent parameterized SQL (no injection found). Object-level
ownership checks are correctly applied on offers, payments, chat and profile-edit endpoints.

However, there are **three critical issues** that allow account takeover and bulk theft of
personal + banking data, plus several high-severity issues around secret management, token
storage, and TLS. These should be addressed before any production/public use.

| # | Severity | Finding |
|---|----------|---------|
| 1 | 🔴 Critical | Password-reset code returned in the API response → trivial account takeover |
| 2 | 🔴 Critical | Live production DB credentials (and keys) committed to git |
| 3 | 🔴 Critical | Any authenticated user can dump all users incl. bank details (BSB/account #) |
| 4 | 🟠 High | Session token stored in plaintext `AsyncStorage`, not `expo-secure-store` |
| 5 | 🟠 High | Weak session-token entropy (48 bits) |
| 6 | 🟠 High | Database TLS certificate validation disabled (`rejectUnauthorized: false`) |
| 7 | 🟠 High | `npm audit`: 26 vulnerabilities (5 high) |
| 8 | 🟡 Medium | DB connection string (with password) logged to stdout on startup |
| 9 | 🟡 Medium | Internal error messages returned to clients (info disclosure) |
| 10 | 🟡 Medium | RevenueCat key hardcoded as fallback in client source |
| 11 | 🟡 Medium | Account enumeration via `/auth/register` 409 response |
| 12 | 🟡 Medium | Over-broad `RECORD_AUDIO` Android permission with no audio feature |
| 13 | 🔵 Low | Weak password policy (6 chars); legacy SHA-256 hashes still accepted |
| 14 | 🔵 Low | Non-constant-time comparisons for reset code / bootstrap password |
| 15 | 🔵 Low | `CORS: Access-Control-Allow-Origin: *`; misc. hardening notes |

---

## 🔴 Critical

### 1. Password-reset code is returned directly in the HTTP response → account takeover

`POST /auth/forgot-password` generates a 6-digit reset code and **returns it in the response body**
instead of delivering it out-of-band (email/SMS):

- [backend/server.js:1384](backend/server.js#L1384) — `return json(res, 200, { ok: true, resetCode });`
- The client even reads it back: [src/auth/storage.ts:217-229](src/auth/storage.ts#L217-L229) (`requestPasswordReset` returns `resetCode`).

**Impact:** This endpoint is unauthenticated. Anyone who knows (or guesses) a victim's email can
call `forgot-password`, read the `resetCode` straight from the JSON, then call
`POST /auth/reset-password` with that code and set a new password — full account takeover of
*any* account (builders, labourers, and owners), with no access to the victim's inbox required.
Reset also invalidates existing sessions, so the attacker fully owns the account.

**Recommendation:** Never return the reset code to the caller. Send it via a trusted channel
(email/SMS provider). Keep the endpoint's response generic (`{ ok: true }`) regardless of whether
the email exists. Remove `resetCode` from the client type/flow.

---

### 2. Live production database credentials (and API keys) committed to git

[.env](.env) is tracked in the repository (despite being listed in [.gitignore](.gitignore)) and
contains a **live Neon Postgres connection string with username and password**, plus the
RevenueCat iOS key and Google OAuth client ID:

- `DATABASE_URL=postgresql://neondb_owner:****@ep-...neon.tech/neondb` — full read/write DB creds
- `EXPO_PUBLIC_RC_API_KEY_IOS`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

These values are also duplicated in [eas.json](eas.json) (`build.production.env`).
`git log` shows `.env` has been tracked since commit `3e901da` ("Big Changes") and is present
throughout history — so rotating the file alone is insufficient; the secret lives in every clone
and the remote.

**Impact:** Anyone with repository access (or anyone the repo is ever shared/leaked to) gets
direct, unrestricted access to the production database: all user PII, password hashes, chat
messages, and labourer bank details. This is the single highest-impact exposure.

**Recommendation:**
1. **Rotate the Neon database password immediately** (and the Google/RevenueCat credentials if
   they are treated as secret — see #10).
2. `git rm --cached .env` and confirm `.gitignore` keeps it out going forward.
3. Purge `.env` from git history (`git filter-repo` / BFG) and force-push, or treat the repo as
   compromised and rotate everything.
4. Inject `DATABASE_URL` only via the host's environment (Render/Neon dashboard), never a file.

> Note: `EXPO_PUBLIC_*` values are *intended* to be bundled into the client and are not secrets
> per se; the critical leak here is `DATABASE_URL`. [backend/.env](backend/.env) is also tracked
> but only holds a localhost dev string (low risk) — still recommend untracking it.

---

### 3. Broken object-level authorization: any logged-in user can read every user's PII + bank details

Two endpoints are gated only by `requireAuth` (any authenticated role) and return the **full**
user record through `rowToUser`, which for labourers includes `bsb` and `accountNumber`
(Australian bank details):

- [backend/server.js:1566-1571](backend/server.js#L1566-L1571) — `GET /users` returns **all** users (`SELECT * FROM users`).
- [backend/server.js:1573-1580](backend/server.js#L1573-L1580) — `GET /users/:email` returns any single user.
- `rowToUser` exposes `bsb` / `accountNumber` for labourers: [backend/server.js:698-709](backend/server.js#L698-L709).

The client uses these broadly (`getUsers`, `getUserByEmail` in [src/auth/storage.ts:87-90](src/auth/storage.ts#L87-L90) and `247-256`).

**Impact:** Any registered user (a labourer can register freely) can enumerate the entire user
base and harvest every labourer's **bank BSB + account number**, full name, email, and address.
This is a mass PII + financial-data breach via a normal authenticated session. It is the
classic IDOR / excessive-data-exposure pattern.

**Recommendation:**
- Never include `bsb` / `accountNumber` (or password-related fields) in any user-listing or
  cross-user lookup response. Return banking data **only** to the owning labourer (`/auth/me`)
  and to the specific builder on a confirmed payment, as the payment receipt flow already does.
- Restrict `GET /users` to `requireOwner`, or remove it; replace cross-user reads with a minimal
  public-profile projection (name, role, occupation, rating, photo) scoped to legitimate need.
- Apply the same projection discipline to `rowToPayment` (`labourerBsb`/`labourerAccountNumber`
  at [backend/server.js:770-771](backend/server.js#L770-L771)) — these are correctly scoped to
  the paying builder today, but keep them off any broader response.

---

## 🟠 High

### 4. Session token stored in plaintext `AsyncStorage` (not `expo-secure-store`)

The bearer session token is persisted in `AsyncStorage`, which is unencrypted on-device storage:

- [src/api/client.ts:35-44](src/api/client.ts#L35-L44) — `getSessionToken` / `setSession` use `AsyncStorage`.
- Tokens have a **30-day TTL** (`SESSION_TTL_MS`, [backend/server.js:14](backend/server.js#L14)).
- `expo-secure-store` is not even a dependency in [package.json](package.json).

**Impact:** On a rooted/jailbroken device, via unencrypted device backups, or through other apps
on a compromised device, the long-lived token can be extracted and replayed for up to 30 days,
giving full account access.

**Recommendation:** Store the session token (and `session_email`) using `expo-secure-store`
(Keychain on iOS, Keystore-backed encryption on Android). Add the dependency and swap the
`AsyncStorage` calls in `src/api/client.ts`. Keep non-sensitive prefs (e.g. `remember_me` flag,
remembered email) in `AsyncStorage` if desired. Consider shortening the TTL and/or adding
sliding expiry.

### 5. Weak session-token entropy

Session tokens are generated by `makeId`, which uses a timestamp plus only **6 random bytes
(48 bits)**:

- [backend/server.js:204-206](backend/server.js#L204-L206) — `` `${prefix}_${now()}_${crypto.randomBytes(6).toString("hex")}` ``
- Used for session tokens at [backend/server.js:870](backend/server.js#L870), `1137`, `1154`.

**Impact:** 48 bits of randomness is below the recommended ≥128 bits for session identifiers,
and the timestamp component further narrows the search space. Brute-force/guessing of valid
tokens is more feasible than it should be (mitigated somewhat by DB lookups, but not rate-limited
on authenticated paths).

**Recommendation:** Use a dedicated generator for session tokens with ≥32 bytes from
`crypto.randomBytes(32).toString("hex")` (or `base64url`). Object IDs (`offer_`, `msg_`,
`pay_`) are lower risk but would also benefit from more entropy.

### 6. Database TLS certificate validation disabled

The Postgres pool disables certificate verification for Neon connections:

- [backend/server.js:31](backend/server.js#L31) — `ssl: usesNeon ? { rejectUnauthorized: false } : undefined`

**Impact:** TLS is negotiated but the server certificate is not validated, leaving the DB
connection open to man-in-the-middle interception/modification — an attacker on the network path
could read or alter all queries and capture the DB credentials.

**Recommendation:** Set `rejectUnauthorized: true` and provide Neon's CA (Neon uses publicly
trusted certs, so the system trust store generally suffices; pin the CA if needed). Avoid
disabling verification in production.

### 7. Dependency vulnerabilities — `npm audit` reports 26 (5 high)

`npm audit --omit=dev` reports **26 vulnerabilities (21 moderate, 5 high)**. High-severity items:

| Package | Issue |
|---------|-------|
| `lodash` | Code injection via `_.template` |
| `node-forge` | `basicConstraints` certificate-chain bypass |
| `@xmldom/xmldom` | XML injection via unsafe CDATA serialization |
| `fast-uri` | Path traversal via percent-encoded dot segments |
| `picomatch` | Method injection in POSIX character classes |

Most are transitive, pulled in via the Expo toolchain (`@expo/*`, `expo-router`,
`expo-dev-client`, `ws`, `yaml`, `postcss`), so several are build-time only. Still, `lodash`,
`node-forge`, and `@xmldom/xmldom` warrant attention.

**Recommendation:** Run `npm audit fix` for non-breaking updates, then evaluate
`npm audit fix --force` / Expo SDK upgrades for the rest. Track residual transitive advisories
and confirm whether vulnerable code paths are reachable at runtime vs. build-time only.

---

## 🟡 Medium

### 8. DB connection string logged to stdout on startup
[backend/server.js:2791](backend/server.js#L2791) logs `Using Postgres: ${DATABASE_URL}` — this
writes the credentials into the hosting platform's log stream (Render logs), where they may be
retained/visible. **Recommendation:** Log only the host/db name, never the full URL.

### 9. Internal error messages leaked to clients
The top-level catch returns the raw exception message:
[backend/server.js:2782-2783](backend/server.js#L2782-L2783) — `error: err.message || "Server error"`.
This can disclose stack/driver details (e.g., SQL or pg errors) to clients.
**Recommendation:** Return a generic message and log details server-side.

### 10. RevenueCat key hardcoded as a fallback in client source
[src/subscription/purchases.ts:5](src/subscription/purchases.ts#L5) hardcodes
`DEFAULT_IOS_API_KEY = "test_TrMdLOfNQKBZCijjWzKpajqqEeE"` (used at line 115).
RevenueCat *public SDK* keys are designed to ship in the client, so this is not a server secret —
but hardcoding plus committing it (also in `.env`/`eas.json`) is poor hygiene and makes rotation
harder. **Recommendation:** Source it only from `EXPO_PUBLIC_RC_API_KEY_IOS`; drop the literal
fallback. Confirm it is the public SDK key (not a RevenueCat secret API key) and rotate if unsure.

### 11. Account enumeration via registration
[backend/server.js:1011](backend/server.js#L1011) returns `409 "Email already exists"`, letting an
attacker probe which emails are registered. (Login and forgot-password are correctly generic.)
**Recommendation:** Consider a generic response or rate-limit + email-verification flow if
enumeration is a concern. Lower priority than #1–#3.

### 12. Over-broad Android permission: `RECORD_AUDIO`
[app.json](app.json) requests `android.permission.RECORD_AUDIO`, but a grep of `app/` and `src/`
found no microphone/audio feature using it. Unused dangerous permissions widen the attack surface
and can trigger store review friction. **Recommendation:** Remove it unless a current feature
needs it.

---

## 🔵 Low / Informational

- **Weak password policy** — minimum 6 characters
  ([backend/server.js:87-94](backend/server.js#L87-L94)). Consider ≥8–10 and breached-password
  checks.
- **Legacy SHA-256 password hashes still accepted** —
  [backend/server.js:185-187](backend/server.js#L185-L187) verifies plain unsalted SHA-256 hashes
  for backward compatibility. New hashes use `scrypt` (good), but there is no forced rehash/upgrade
  on successful login, so old fast-hash records persist. **Recommendation:** Transparently rehash
  to `scrypt` on next successful login, then drop SHA-256 support.
- **Non-constant-time comparisons** — reset-code check uses `!==`
  ([backend/server.js:1431](backend/server.js#L1431)) and owner-bootstrap password uses `===`
  ([backend/server.js:1114](backend/server.js#L1114)). Timing impact is low (rate-limited, hashed
  reset codes), but prefer `crypto.timingSafeEqual` as is already done for `scrypt`.
- **CORS `Access-Control-Allow-Origin: *`** — [backend/server.js:51](backend/server.js#L51).
  Acceptable for a token-based mobile API (no cookie credentials), but if a web client is ever
  added, scope this to known origins.
- **`.certs/kaspersky-ca.cer` committed** — an unusual root-CA file in the repo
  ([.certs/](.certs/)). Worth confirming why it's present; remove if it was added for a one-off
  local proxy and is no longer needed.
- **Owner password-reset is god-mode** — `POST /owner/support/users/:email/reset-password`
  ([backend/server.js:1810-1851](backend/server.js#L1810-L1851)) lets an owner set any user's
  password with no notification to the user. This is correctly gated to `requireOwner` and
  rate-limited, but consider notifying the affected user and/or logging an audit trail.

---

## What is implemented well (no action needed)

- **Opaque server-side sessions** stored in a `sessions` table with TTL expiry and deletion on
  logout / password reset / account disable ([backend/server.js:833-848](backend/server.js#L833-L848)).
- **`scrypt` password hashing** with per-user salt and `timingSafeEqual`
  ([backend/server.js:166-202](backend/server.js#L166-L202)).
- **Real OAuth token verification** — Apple JWT signature checked against Apple's JWKS with
  issuer/audience/exp validation; Google token validated via tokeninfo with issuer/audience/
  email-verified checks ([backend/server.js:262-315](backend/server.js#L262-L315)).
- **Rate limiting** on login (per IP + per email), register, forgot/reset, and social auth
  ([backend/server.js:15-24](backend/server.js#L15-L24), enforced per endpoint).
- **Role/route protection is consistently enforced server-side:**
  `requireOwner` guards every `/owner/*` endpoint
  ([backend/server.js:859-867](backend/server.js#L859-L867)); offer/payment/chat/profile endpoints
  check `role` *and* object ownership (e.g. offers
  [server.js:2396-2408](backend/server.js#L2396-L2408), `2410-2433`; payments
  [server.js:2656-2702](backend/server.js#L2656-L2702); chat scoped to the caller's email
  [server.js:2141-2162](backend/server.js#L2141-L2162); profile edits scoped to self
  [server.js:1925-1992](backend/server.js#L1925-L1992)). A labourer **cannot** reach owner/admin
  functions or act on another user's offers/payments — these are enforced on the server, not just
  hidden in the client UI. (The exceptions are the over-broad `/users` reads in finding #3.)
- **Privilege escalation blocked at signup** — both `/auth/register`
  ([server.js:1007-1008](backend/server.js#L1007-L1008)) and `/auth/complete-onboarding`
  ([server.js:1224-1336](backend/server.js#L1224-L1336)) restrict role to `builder`/`labourer`;
  `owner` can only be created via the env-configured bootstrap credentials.
- **Parameterized SQL throughout** — no string-concatenated queries found; no SQL injection
  identified.
- **Request hardening** — security headers (HSTS, `X-Frame-Options`, `nosniff`, CSP), HTTPS
  enforcement in production ([server.js:977-980](backend/server.js#L977-L980)), and a 1 MB request
  body cap ([server.js:425-441](backend/server.js#L425-L441)).
- **Disabled-account enforcement** — disabled users are rejected at login and their sessions
  purged ([server.js:1149](backend/server.js#L1149), `1771`).

---

## Suggested remediation order

1. **#1** Stop returning the reset code; deliver it out-of-band. *(account takeover)*
2. **#2** Rotate DB credentials, untrack `.env`, purge history. *(full DB compromise)*
3. **#3** Strip banking/PII from `/users` + `/users/:email`; gate/remove the listing. *(mass PII breach)*
4. **#4 / #6** Move tokens to `expo-secure-store`; enable DB cert validation.
5. **#5, #7–#12** Token entropy, dependency patches, logging/error hygiene, permissions.
6. **#13–#15** Policy and hardening cleanups.
