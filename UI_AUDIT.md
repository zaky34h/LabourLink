# Labourlink — UI Reskin Audit

> Read-only audit for a visual reskin. **No code was changed.** Functionality and
> flows stay as-is; this documents the current UI so a new visual style can be
> applied safely.
>
> Generated: 2026-06-07

---

## 1. Stack & Structure

### What it's built in
- **Framework:** React Native (via **Expo**), **not** native Swift/UIKit/SwiftUI.
  The `ios/` folder is generated native scaffolding (Pods, Xcode workspace) — you
  don't edit it for a reskin.
- **Language:** TypeScript (`strict: true`, extends `expo/tsconfig.base`).
- **Versions:**
  - Expo SDK `~54.0.33`
  - React Native `0.81.5`
  - React / React DOM `19.1.0`
  - expo-router `~6.0.23` (file-based routing)
  - **New Architecture enabled** (`newArchEnabled: true`)
- **App identity:** name `LabourLink`, version `1.1.0`, iOS bundle
  `com.linkgroup.labourlink`, Apple Sign In enabled.
- **Forced light mode:** `app.json` sets `"userInterfaceStyle": "light"`. There is
  **no dark-mode support today** — relevant if your reskin wants one.

### Folder structure (where UI lives)
```
app/                 ← ALL screens (expo-router file-based routing)
  _layout.tsx        ← root Stack (headers hidden globally)
  index.tsx          ← Login screen (app entry)
  auth/              ← shared auth & onboarding screens
  builder/           ← BUILDER side (tab navigator + nested screens)
  labourer/          ← LABOURER side (tab navigator + nested screens)
  owner/             ← OWNER/admin portal (tab navigator + nested screens)
  chat/              ← shared 1:1 chat (Stack)
src/                 ← non-screen logic + the few shared UI pieces
  ui/FormScreen.tsx          ← shared layout wrapper (the ONLY generic UI primitive)
  auth/AuthSocialButtons.tsx ← Google/Apple sign-in buttons (shared component)
  subscription/SubscriptionPaywallModal.tsx ← paywall modal (shared component)
  api/, auth/, chat/, offers/, payments/, owner/, notifications/,
  saved-labourers/, subscription/  ← storage/data/hooks (no styling)
  data/labourers.ts          ← mock seed data
  types.ts
assets/              ← images: app icon, splash, logo, Google button art
backend/             ← Node API (out of scope for reskin)
android/, ios/       ← generated native projects (out of scope)
```

UI code is almost entirely in **`app/`** (~6,300 lines of screen code), with 3
shared UI pieces in `src/`.

### How navigation is wired
- **expo-router file-based routing** — the folder/file layout *is* the nav tree.
  No storyboards, no manual router config, no React Navigation calls by hand.
- **Root** ([app/_layout.tsx](app/_layout.tsx)): a `Stack` with `headerShown: false`
  (every screen draws its own header).
- **Login** is the entry route ([app/index.tsx](app/index.tsx)). On launch it
  checks "remember me" + session and redirects via
  [routeForUser()](src/auth/routing.ts) to the correct role home.
- **Per-role tab bars** (`Tabs` from expo-router):
  - [app/builder/_layout.tsx](app/builder/_layout.tsx) — Home / Browse / Messages / Offers / Pay / Profile (+ hidden: subscription, saved, labourer detail)
  - [app/labourer/_layout.tsx](app/labourer/_layout.tsx) — Home / Messages / Offers / Schedule / Pay / Profile
  - [app/owner/_layout.tsx](app/owner/_layout.tsx) — Home / Builders / Labourers / Reports / Support (+ hidden detail screens)
- **Chat** ([app/chat/_layout.tsx](app/chat/_layout.tsx)): nested `Stack`.
- Navigation is done imperatively with `router.push()` / `router.replace()`.
- Tab bars are styled inline in each `_layout` (active tint `#111`, inactive
  `#444444`, bold labels) — **the tab styling is duplicated across all three layouts.**

---

## 2. Screen Inventory

Side key: **L** = Labourer, **B** = Builder, **O** = Owner, **S** = Shared.

| Screen | File | Purpose | Side |
|---|---|---|---|
| Login | [app/index.tsx](app/index.tsx) | Email/password + Google/Apple login, "remember me", entry redirect | S |
| Register | [app/auth/register.tsx](app/auth/register.tsx) | Create account | S |
| Role select | [app/auth/role.tsx](app/auth/role.tsx) | Choose "I'm a Builder" / "I'm a Labourer" | S |
| Onboarding | [app/auth/onboarding.tsx](app/auth/onboarding.tsx) | Post-signup profile setup (trade, certs, etc.) | S |
| Forgot password | [app/auth/forgot-password.tsx](app/auth/forgot-password.tsx) | Request reset email | S |
| Reset password | [app/auth/reset-password.tsx](app/auth/reset-password.tsx) | Set new password | S |
| Builder Home | [app/builder/home.tsx](app/builder/home.tsx) | Dashboard, quick actions, **generate work offer** (largest screen, 885 lines) | B |
| Browse | [app/builder/browse.tsx](app/builder/browse.tsx) | Search/filter labourers by trade/date | B |
| Builder Messages | [app/builder/messages.tsx](app/builder/messages.tsx) | Conversation list | B |
| Builder Offers | [app/builder/offers.tsx](app/builder/offers.tsx) | Sent work offers + offer detail / share | B |
| Builder Pay | [app/builder/pay.tsx](app/builder/pay.tsx) | Payment items, edit/save | B |
| Builder Profile | [app/builder/profile.tsx](app/builder/profile.tsx) | Company profile + logo upload | B |
| Saved Labourers | [app/builder/saved.tsx](app/builder/saved.tsx) | Bookmarked labourers (hidden tab) | B |
| Subscription | [app/builder/subscription.tsx](app/builder/subscription.tsx) | Manage subscription (hidden tab) | B |
| Labourer detail (builder view) | [app/builder/labourer/[email].tsx](app/builder/labourer/[email].tsx) | View a labourer's full profile, message/save | B |
| Labourer Home | [app/labourer/home.tsx](app/labourer/home.tsx) | Dashboard, chats/offers stats, quick actions | L |
| Labourer Messages | [app/labourer/messages.tsx](app/labourer/messages.tsx) | Conversation list | L |
| Labourer Offers | [app/labourer/offers.tsx](app/labourer/offers.tsx) | Received offers, accept/decline, detail/share | L |
| Schedule | [app/labourer/schedule.tsx](app/labourer/schedule.tsx) | Calendar of availability + confirmed work | L |
| Labourer Pay | [app/labourer/pay.tsx](app/labourer/pay.tsx) | Payment items, view receipts | L |
| Labourer Profile | [app/labourer/profile.tsx](app/labourer/profile.tsx) | Personal profile + photo upload | L |
| Chat | [app/chat/[email].tsx](app/chat/[email].tsx) | 1:1 messaging thread | S |
| Owner Home | [app/owner/home.tsx](app/owner/home.tsx) | Admin portal dashboard + quick actions | O |
| Owner Builders | [app/owner/builders.tsx](app/owner/builders.tsx) | List of all builders | O |
| Owner Labourers | [app/owner/labourers.tsx](app/owner/labourers.tsx) | List of all labourers | O |
| Owner Reports | [app/owner/reports.tsx](app/owner/reports.tsx) | Platform ops summary, printable report | O |
| Owner Support | [app/owner/support.tsx](app/owner/support.tsx) | Admin tools: force logout, reset password, search | O |
| Builder detail (owner view) | [app/owner/builder/[email].tsx](app/owner/builder/[email].tsx) | Admin view of a builder | O |
| Labourer detail (owner view) | [app/owner/labourer/[email].tsx](app/owner/labourer/[email].tsx) | Admin view of a labourer | O |

**Shared UI pieces (not full screens):**
[FormScreen](src/ui/FormScreen.tsx) (keyboard-aware safe-area wrapper),
[AuthSocialButtons](src/auth/AuthSocialButtons.tsx),
[SubscriptionPaywallModal](src/subscription/SubscriptionPaywallModal.tsx).

### Main user flows
**Labourer:** Login/Register → Role select → Onboarding (profile/trade/certs) →
Labourer Home → receive Offers (accept/decline) → Chat with builder → manage
Schedule / Pay / Profile.

**Builder:** Login/Register → Role select → Onboarding → **Subscription/paywall
gate** → Builder Home → Browse labourers → Labourer detail (save / message) →
Generate Work Offer → Offers (track) → Chat → Pay / Profile.

**Owner (admin):** Login → Owner Home → Builders / Labourers lists → detail
screens → Reports & Support tools.

---

## 3. Current Design System  ⚠️ (the critical section for a reskin)

### TL;DR
There is **no design system**. There is **no theme file, no constants file, no
StyleSheet, no asset-catalog colors.** 100% of styling is **inline `style={{…}}`
objects** with **hardcoded values**. The good news: the values are *consistent*
(the same handful of hexes/sizes repeat), so the palette is well-defined even
though it's copy-pasted everywhere.

### Colours
- **Centralised? No.** Zero theme/colors/tokens modules exist. (`grep` for any
  theme/colors/constants import returns nothing relevant.)
- **478 hardcoded hex literals** across `app/` + `src/`, all inline.
- The de-facto palette (by frequency):

| Hex | Count | Role |
|---|---|---|
| `#111111` / `#111` | ~219 | Primary dark — text, buttons, borders |
| `#FDE047` | 77 | **Brand yellow** — primary accent, button text on dark, CTAs |
| `#fff` / `#ffffff` | ~95 | Surfaces / card backgrounds |
| `#FFF8D9` | 7 | Cream auth-screen background |
| `#FFE15A` / `#FEF08A` | ~6 | Lighter yellow accents / decorative blobs |
| `#444444` / `#444` | ~18 | Muted/secondary text, disabled buttons, inactive tab |
| `#DC2626` / `#B91C1C` | ~10 | Red — errors, unread dot, destructive |
| `#166534` / `#DCFCE7` | ~6 | Green — success/approved states |
| `#B45309` / `#FEF9C3` / `#FEF2F2` | ~9 | Amber/pale status backgrounds (pending) |
| `#6B7280` / `#9A9A9A` / `#666` / `#555` / `#333` | ~12 | Greys (borders, secondary text) |
| `#f3f4f6` / `#f8fafc` / `#fafafa` | ~5 | Pale neutral backgrounds |
| `rgba(0,0,0,0.35)` / `#11111188` / `#11111122` | few | Overlays / dividers |

**Brand identity = black + construction yellow on cream.** Consistent, which is
the single biggest thing working in a reskin's favour.

### Typography
- **Centralised? No.** No `fontFamily` anywhere → **system font only** (SF on iOS).
  A reskin that wants a custom typeface must add it and touch every `<Text>`.
- **Weights** (heavily bold-leaning): `900` ×161, `700` ×71, `800` ×30,
  `600` ×5, `500` ×3.
- **Sizes** (scattered, no scale): 24 (×19), 18 (×16), 16 (×13), 12 (×11),
  20 (×10), 26 (×8), 17, 28, 22, 14, 11. No semantic naming (h1/body/caption).

### Spacing / layout / radii / shadows
- **Spacing:** ad-hoc `padding`/`gap`/`margin` numbers per screen; common values
  16 / 24 / 14 / 18 / 8 but no shared spacing scale.
- **Corner radii:** `10` (×61), `12` (×48), `14` (×18), `16` (×13), `18` (×8),
  pills `999` (×3), plus large decorative circles (130–170). Roughly consistent
  (10–18 for cards/buttons/inputs) but not tokenised.
- **Shadows / elevation:** **none.** No `shadow*` or `elevation` props anywhere —
  the look is flat with `borderWidth: 1` + `borderColor: "#111"` outlines instead.
  Adding depth in a reskin is greenfield.

### Component library
- **Essentially none.** Only **3** reusable UI pieces exist:
  - [FormScreen](src/ui/FormScreen.tsx) — safe-area + keyboard-aware scroll wrapper.
  - [AuthSocialButtons](src/auth/AuthSocialButtons.tsx) — Google/Apple buttons.
  - [SubscriptionPaywallModal](src/subscription/SubscriptionPaywallModal.tsx) — modal.
- **Everything else is one-off inline markup.** Buttons, cards, list rows, inputs,
  badges, and headers are hand-built with `<Pressable>`/`<View>`/`<Text>` and
  duplicated styling on every screen. For example the primary button
  (`backgroundColor:"#111"`, `borderRadius:12`, yellow `#FDE047` bold label) and
  the bordered input (`borderWidth:1`, `borderColor:"#111111"`, `borderRadius:10`,
  `padding:14`) are re-typed dozens of times rather than shared.
- **No `StyleSheet.create` is used at all** — every screen passes inline object
  literals, so styles aren't even collected per file.

### Icons & image assets
- **Icons:** `@expo/vector-icons` **Ionicons**, used **only in the 3 tab layouts**
  (home, list, chatbubble, document-text, card, person, business, people,
  calendar, shield-checkmark). Screens themselves use almost no inline icons.
- **Images** (`assets/`):
  - `labourlink-logo.png` — wordmark/logo (used on auth screens, ×6 references)
  - `labourlink-app-icon.png` / `labourlink-app-icon-safe.png` — app icon
  - `splash-icon.png`, `adaptive-icon.png`, `icon.png`, `favicon.png`
  - Google button art: `google-continue-light.png`, plus a few unused
    `google-*` variants
- **Custom vs system:** logo + Google art are custom raster PNGs; all functional
  icons are system (Ionicons vector). No custom icon font/SVG set.
- Mock seed data lives in [src/data/labourers.ts](src/data/labourers.ts).

---

## 4. Reskin Risk Report

### Reskin-friendliness score: **2 / 5** (moderately hard, but very fixable)

It is *not* a disaster — the framework is modern and the visual language is
consistent — but the **lack of any abstraction layer** means a reskin today is a
large, repetitive find-and-touch job across ~30 screens.

### What makes it hard
1. **No theme / token layer.** 478 hardcoded hex values inline. Changing the
   brand yellow or dark means editing hundreds of call-sites (across upper/lower
   case variants like `#FDE047` vs `#fde047`, `#111` vs `#111111`).
2. **No shared components.** Buttons/cards/inputs/badges are re-implemented inline
   on every screen, so a restyle must be repeated per occurrence (and risks drift).
3. **No `StyleSheet`, all inline objects.** Styles aren't named or grouped, so
   there's nothing central to edit and search-replace is the only lever.
4. **Scattered type scale & spacing.** No semantic sizes/weights/spacing to retune
   in one place.
5. **Duplicated tab-bar styling** across the three `_layout.tsx` files.
6. **Light-mode only** (`userInterfaceStyle: "light"`, no `fontFamily`,
   no shadows) — fine if you stay light/flat, but adding dark mode or depth is
   net-new work touching every screen.

### What makes it easier (genuinely in your favour)
- **Single, modern stack** — pure React Native + expo-router. **No mixed
  UIKit/SwiftUI**, no storyboards, no React Navigation hand-wiring, **no
  deprecated UI APIs** to migrate.
- **Highly consistent palette and patterns** — the same hexes, radii, and the
  same black/yellow button + bordered input recur everywhere. Consistency means
  componentising is mechanical, and even a brute-force color swap is predictable.
- **TypeScript strict** — refactors (e.g. swapping inline styles for a shared
  `<Button>`) are type-checked.
- **Flows untouched** — your goal (same screens, new look) maps cleanly onto
  introducing a presentation layer without touching the storage/auth/router logic
  in `src/`.

### Recommended cleanest path to a global reskin
Do this as a **read-then-refactor**, bottom-up, so each step compounds:

1. **Create a theme module** (e.g. `src/theme/index.ts`) exporting
   `colors`, `spacing`, `radii`, `typography` (size + weight scales). Seed it from
   the palette/table above so the current look is preserved exactly.
2. **(Optional, recommended) wire colors through the asset catalog / a
   `useColorScheme` hook** if you want dark mode later — otherwise plain constants
   are fine for a one-shot reskin.
3. **Build a small shared component set** in `src/ui/`:
   `Button` (primary/secondary/destructive variants), `Card`, `ListRow`,
   `TextField`, `Badge`/`StatusPill`, `ScreenHeader`. Bake the theme tokens in.
   You already have `FormScreen` as the pattern to follow.
4. **Migrate screen-by-screen**, replacing inline markup with the new components +
   tokens. Start with the highest-traffic / most-duplicated:
   [app/index.tsx](app/index.tsx) (login), the home screens, then offers/profile.
   [app/builder/home.tsx](app/builder/home.tsx) (885 lines) is the biggest single
   payoff but also the riskiest — do it after the component set is proven.
5. **Centralise the tab-bar style** into one shared `screenOptions` object used by
   all three `_layout.tsx` files.
6. **Now reskin by editing the theme** — once screens consume tokens/components,
   the actual new visual style (colors, radii, type, shadows) is a handful of edits
   in one file.

> Fast interim option if you need a look-change *before* full componentisation:
> a careful case-insensitive find/replace on the core palette
> (`#FDE047`, `#111111`/`#111`, `#FFF8D9`) gets you 80% of a recolor in minutes —
> but it won't fix layout/typography/components and will leave the duplication in
> place. Treat it as a preview, not the destination.
