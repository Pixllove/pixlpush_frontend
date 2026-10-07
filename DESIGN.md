# PixlPush Design System

How PixlPush looks and behaves. Read this before any UI work and follow it over personal taste. If a screen
needs something that is not here, change the screen or extend this file and the theme together; never
solve it with one-off styling on the screen.

## 1. Where the design lives

| Place | What it holds |
|---|---|
| `lib/theme.ts` | The MUI theme: the exported `tokens` and every component override. **The source of truth.** |
| `app/globals.css` | The same tokens as `--pp-*` variables on `:root`, and the "PixlPush design layer" at the end of the file for class-based surfaces (shell, cards, tables, auth, campaign review) |
| `app/layout.tsx` | Loads Inter once (`--font-inter`) |
| `components/dashboard/SearchField.tsx` | The one search box |
| `components/website/AuthShell.tsx` | The one frame for every auth page |
| `components/auth/AuthFeedback.tsx` | `FormError`, `AuthStatus` (icon tile + title + action), `Toast` |
| `components/auth/PasswordField.tsx` | Password field with show/hide, and `PasswordRule` |
| `components/dashboard/ReusableDataTable.tsx` | The shared list table with loading, empty and paging |

**Rules of use**

1. A component gets its look from the theme. A screen writes `<Button>`, `<TextField>`, `<Select>`,
   `<Tabs>`, `<Chip>` with no styling and gets the design.
2. `sx`, `style` and `className` at a call site are for **layout only**: width, flex, grid, margin, gap,
   alignment. Never colour, background, border, radius, height, padding, font size or weight.
3. When a raw value is unavoidable, use `tokens.*` in TypeScript or `var(--pp-*)` in CSS. No hex colours in
   screens.
4. No new styling system, font, accent colour, or dependency for UI.

## 2. Principles

PixlPush is a work tool for retention teams. It should read as a mature, funded product: calm, exact and
dense enough to work in.

- **Neutral first.** About 85–90% of a screen is neutral. The accent marks what is interactive or active;
  semantic colours mark status. Nothing is coloured for decoration.
- **Structure from type, space and hairlines**, not from boxes and shadows.
- **Three weights, a short size list.** Hierarchy comes from size and colour, never from heavier type.
- **Small corners.** 4–10px; pills only for badges, chips, avatars and switches.
- **One of each.** One field, one tab bar, one search box, one table, one auth frame. If two screens show
  the same kind of control, it is the same component.
- **Light workspace, plum sidebar.** The app is never dark.
- **Loading is never "disabled".** Waiting is shown with skeletons or loading rows, not greyed-out controls.

## 3. Colour

| Token | CSS variable | Value | Use |
|---|---|---|---|
| `accent` | `--pp-accent` | `#5517B8` | Primary buttons, links, focused field outline, active states |
| `accentHover` | `--pp-accent-hover` | `#4712A0` | Hover and pressed |
| `accentSoft` | `--pp-accent-soft` | `#F3EEFC` | Icon tiles, selected menu item, active count chip |
| `accentLine` | `--pp-accent-line` | `#DCCDF6` | Border of an accent-tinted surface |
| `secondary` | — | `#FF5A2C` | Sparingly: the logo, a chart series. Never a second button colour |
| `canvas` | `--pp-canvas` | `#FAF9FB` | Page background in the app |
| `surface` | `--pp-surface` | `#FFFFFF` | Cards, tables, fields, dialogs, top bar, the auth form column |
| `subtle` | `--pp-subtle` | `#F5F3F7` | Tab track, hover, neutral chips, disabled fill, quiet info tiles |
| `border` | `--pp-border` | `#EAE6EF` | Default hairline |
| `borderStrong` | `--pp-border-strong` | `#D9D3E1` | Field and secondary-button outlines |
| `text` | `--pp-text` | `#1E1429` | Primary text |
| `textSecondary` | `--pp-text-2` | `#625A6E` | Supporting text, labels |
| `textMuted` | `--pp-text-3` | `#8E879A` | Table headers, placeholders, adornment icons, footnotes |
| `plum` | `--pp-plum` | `#1B1025` | Sidebar, tooltips, toasts |
| `plumSoft` | `--pp-plum-soft` | `#281838` | Active sidebar row, sidebar project card |
| `plumLine` | `--pp-plum-line` | `#3B2A4F` | Hairlines on plum |

On plum: text `#F6F1FB`, body `#C7BACE`, muted `#8D7899`, accent `#A67BF5` (the `--sb-*` variables on
`.dashboard-sidebar`). The sidebar is flat plum: no gradient.

**Semantic** (status only):

| Meaning | Text | Soft fill | Variables |
|---|---|---|---|
| Success: running, active, paid, sent, verified | `#12805C` | `#E7F6EF` | `--pp-success`, `--pp-success-soft` |
| Warning: draft, attention, expired link | `#A15C07` | `#FDF3DC` | `--pp-warning`, `--pp-warning-soft` |
| Error: failed, destructive | `#C0352B` | `#FDECEA` | `--pp-error`, `--pp-error-soft` |
| Info: scheduled | `#1F5FBF` | `#E8F0FD` | `--pp-info`, `--pp-info-soft` |

**The accent surface: `var(--pp-hero)`.** One navy-to-violet surface with soft glows, defined in
`app/globals.css`. It is the only gradient in the product and is used for a small set of feature blocks:
the Overview health block, the current-plan block in Billing, the Integrations intro, the default saved
payment card, and the brand panel of the auth pages. Text on it is white; secondary text is white at
72–82% opacity. Do not invent other gradients, and do not use it for ordinary cards.

**Left alone on purpose**
- The email editors keep their own charcoal chrome and green accent (`--ed-*` variables, `.email-fullscreen`).
  They take the shared shapes and sizes, in their own colours.
- Email content that users design is content, not UI. It is never restyled and keeps email-safe fonts.
- The marketing pages keep their warm gradient hero sections.

## 4. Typography

Inter, loaded once in `app/layout.tsx`, with `calt`, `cv11`, `ss01` and antialiasing. A monospace stack
(`var(--pp-mono)`) for code, ids, keys and DNS records only. No other font in the UI.

**Weights: three and nothing else**

| Weight | Use |
|---|---|
| 400 | Body text, table cells, descriptions, helper text, field values |
| 500 | UI text: labels, nav items, tabs, table headers, chips, links, subtitles |
| 600 | Headings, buttons, metric numbers, the active tab, the one value in a row that must stand out |

Nothing is heavier than 600 or lighter than 400. `b` and `strong` render at 600. Never use `bold`.

**Sizes**

| Size | Use | Variant |
|---|---|---|
| 11 | Overline, small badge, tiny meta | `overline` |
| 12 | Caption, table header, helper text, chip, footnote | `caption`, `h6` |
| 13 | Secondary body, table cells, small buttons, compact controls | `body2`, `subtitle2` |
| 14 | Body, fields, buttons, tabs, menu items (the base) | `body1`, `h5`, `subtitle1` |
| 16 | Card title, dialog title | `h3`, `h4` |
| 20 | Section title | `h2` |
| 24 | Page title | `h1` |
| 28, 32 | Metric numbers only, with tabular figures | — |

- Nothing inside the app is larger than the 24px page title except a metric.
- Marketing pages may also use 32, 40, 48 and 56 for display headings, at 600 with negative tracking. The
  auth brand panel headline is 32px.
- Minimum text size is 11px.
- Labels are sentence case. Uppercase only for the 11px overline.
- Supporting text is `textSecondary`, never a lighter weight.
- Prefer a Typography `variant` over inline `fontSize` / `fontWeight`.

**Outside the scale on purpose:** email content, the phone mocks (`.ios-*`, `.push-phone-*`, `.push-lock-*`,
`.push-screen-*`), the miniature illustrations (`.hero-*`, `.art-*`, `BlockDesign.tsx`), the face of the
saved payment card, and icon sizes (a `fontSize` on an icon sets the icon's size, not text).

## 5. Spacing, radius, elevation

**Spacing:** 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Content max-width 1320px with 28px gutters, 32px
above the page title, 24px between sections. Inside a card or form: 16px between fields that have no
floating label, **20–24px between fields with floating labels** (the label sits on the outline and needs
the room), 24px between groups.

**Radius**

| Token | Value | Use |
|---|---|---|
| `dense` | 4px | Menu items, checkboxes, tooltips |
| `control` | 6px | Buttons, fields, selects, alerts |
| `card` | 8px | Cards, panels, table containers, icon tiles, the pill inside a tab bar |
| `overlay` | 10px | Dialogs, menus, popovers, the tab track |
| `pill` | 9999px | Status badges, count chips, avatars, switches only |

The theme base is 4px, so `sx={{ borderRadius: 2 }}` is 8px. The auth brand panel is the one 16px surface.

**Elevation: three levels**

1. **Flat**: no border, no shadow. The default.
2. **Subtle**: white, 1px `border`, 8px radius. A real group: a table, a plan, a form.
3. **Elevated**: hairline plus shadow, only for things that float. Menu/popover
   `0 8px 24px rgba(30,20,41,.10), 0 2px 6px rgba(30,20,41,.05)`; dialog `0 24px 64px rgba(30,20,41,.20)`.

Cards never have a shadow. No bordered card inside a bordered card: use a hairline row or a `subtle` tile.

## 6. Components

### Buttons
40px tall (32 `size="small"`, 44 `size="large"`), 16px side padding, 6px radius, 14px/600, no ripple, no
uppercase, no elevation.
- **Primary** (`contained`): accent fill. One per view.
- **Secondary** (`outlined`): white, `borderStrong` hairline, dark label.
- **Tertiary** (`text`): label only.
- **Destructive**: outlined error; contained error only inside a confirmation dialog.
- Pressed moves 0.5px; keyboard focus shows a 3px accent ring.
- Submit buttons use `SubmitButton` (`components/auth/SubmitButton.tsx`): it keeps its width and shows a
  spinner while pending.
- Round icon-only actions that sit on a connector (the journey builder's plus) are 30px white circles with a
  `borderStrong` hairline; they must set a fixed width so a narrow parent cannot collapse them.

### Fields and dropdowns
One box for every text field, select and autocomplete, defined only in the theme.
- **40px tall** (the button height), 6px radius, white, `borderStrong` outline, 14px text, 12px side padding.
  All of them are this size by default; never pass a size to make one bigger.
- **Compact**: `className="compact"` gives 32px / 13px. Only for table footers (rows-per-page) and dense
  toolbars.
- **Multiline** starts at three rows (88px) and grows.
- **Labels are floating labels** (`label="…"`): 14px `textSecondary`, centred when empty, 12px on the outline
  when filled or focused. Do not put a separate text label above a field.
- **Focus is a 2px accent outline, shown instantly.** No glow ring (a ring is a box-shadow and cuts through
  the floating label) and no fade.
- Error: error outline with 12px error text under the field. Disabled: `subtle` fill, muted text.
- Helper text 12px, 4px below. Adornment icons 18px `textMuted`; the dropdown chevron 20px.
- **Dropdown menu**: opens 4px below the trigger, 10px radius, 6px padding, items 36px tall with 8px/10px
  padding and a 2px gap, hover `subtle`, selected item `accentSoft` at weight 500, at most 320px tall.
- A dropdown never offers an empty "-" option as a real choice.
- **Width**: a field fills its column. Toolbar controls keep a set width: search 320px, filters 160–220px,
  rows-per-page 72px.
- A field is `disabled` only when the user may not edit it, it is read-only by nature, or its own form is
  being submitted. See Loading.

### Search
Always `SearchField`. Never hand-build a search box.
- The standard field with a magnifier on the left and a clear (×) button on the right once there is text.
- Escape clears; Enter searches at once. 320px wide in a toolbar unless told otherwise.
- `value` / `onChange` are the text as typed. For lists answered by the server, drive the request from
  `onSearch`, which fires 200ms after the user stops typing. Never send a request on every key.
- The list shows loading rows from the first key typed, so the screen reacts immediately.
- Placeholders say what can be searched, in sentence case, without trailing dots: "Search journeys",
  "Search by user ID, email or country".

### Tabs
One design everywhere: **sliding pill tabs**, defined only in the theme.
- A soft track (`subtle`, 1px `border`, 10px radius, 4px padding) holds the tabs. A white 8px pill with a
  faint shadow slides behind the active tab over 200ms. **No underline and no divider under the row.**
- Tabs are 36px tall, 14px side padding, 14px/500 `textSecondary`; the active tab is `text`/600.
- The track is as wide as its tabs, never full width, with 16px of space below it. It scrolls sideways
  when it does not fit.
- Icons are optional, 16px, left of the label, in the label's colour (no coloured tab icons).
- Counts are 20px chips after the label: neutral, turning accent-soft on the active tab. A chip with its own
  colour (for example a green "Save 17%") keeps it.
- Use MUI **`Tabs` / `Tab`** for switching a section or a view, including small either/or choices such as
  Monthly / Yearly. Use **`ToggleButtonGroup` / `ToggleButton`** only where a control sets a value inside a
  form or toolbar (preview size, editor options); it has the same look, and `size="small"` gives 30px / 13px.
- Tab rows have `role="tab"`; tests look them up by that role.

### Cards
8px radius, hairline, no shadow, 16–24px padding, an `h3` title. Content inside a card is spaced with a gap
(20px), not with margins on each child. Icon tiles are 36px (48px on status screens), 8px radius,
`accentSoft` with an accent icon; other colours only when they carry meaning.

### Tables
The most important surface in the app; use `ReusableDataTable` for lists.
- Header: 12px/500 `textMuted`, sentence case, no fill, a hairline below.
- Rows: 13px, 12×16px cell padding, a hairline between rows, hover `#FAF8FC`, selected `accentSoft`.
- Numbers right-aligned with tabular figures. Dates in one format, `textSecondary`.
- Row actions are quiet icon buttons that darken on hover; delete turns red on hover only.
- Tabs sit above the table; search and filters share one toolbar row.
- Every table handles loading (skeleton rows), empty (one sentence, one action) and error.

### Badges and chips
20–22px pills, 11–12px/500, soft fill with matching text by meaning: Running/Active/Paid green, Draft amber,
Scheduled blue, Paused orange, Failed red, Archived grey. Use `<Chip color="success | warning | error |
info | primary">` for a coloured chip; a chip with no colour is neutral. A pill is never a control.

### Plan label and upgrade
The plan beside a project name is just the plan: "Free", "Starter", "Pro", "Enterprise" (`planLabel`).
"Upgrade to Pro" is hidden when the project is already on Pro or Enterprise.

### Dialogs, menus, toasts, alerts
- Dialog: 10px radius, 24px padding, 16px/600 title, actions right-aligned (tertiary, then primary), backdrop
  `rgba(30,20,41,.45)`.
- Menu / popover: 10px radius, hairline and the menu shadow.
- Tooltip and toast: plum, white text.
- Alert: 6px radius, soft semantic fill with a matching hairline. Form errors appear as an alert above the
  first field (`FormError`), never clearing what the user typed.

### Switch
The themed MUI `Switch` (accent when on). Do not hand-build toggles.

### Empty state
An accent-soft icon tile, a 20px title, one sentence, one primary button. No dark or gradient hero cards.

## 7. Loading and data states

- **Loading is not disabled.** A query's loading state must never disable a field or a form. While a form's
  first data loads, render `Skeleton`s of the fields' size (40px tall, 88px for multiline, same width), then
  swap in the real fields without the layout moving.
- A field may be disabled only for permission, read-only data, or its own submit in flight.
- **Never show the previous view's data as if it were current.** When a tab, search term or page changes,
  show loading rows until the new data arrives (`isPlaceholderData` → loading). Keeping the old result is
  allowed only to stop counts and totals from blinking.
- **No page-wide dimming.** Nothing fades or greys the whole page on load or reload. A fade for switching
  projects runs only when moving between two real projects.
- Lists use skeleton rows shaped like the data; no full-page spinners for lists.
- A typed-into field never loses its text because data arrived late.

## 8. Layout and navigation

- **Sidebar**: 212px, flat plum, a brand row the height of the top bar, 12px/500 group labels, 40px rows with
  16px outlined icons; the active row is `plumSoft` with a 2px `#A67BF5` indicator. Navigation highlights
  instantly on click.
- **Top bar**: 60px, white, a bottom hairline, no shadow. Project switcher and search on the left, actions on
  the right.
- **Page header**: title (`h1`) and one line on the left, the primary action on the right, identical on every
  screen.
- **Page body**: sections separated by 24px. Reserve cards for real objects; do not wrap every section in one.
- **Forms**: a single column of fields with floating labels; related fields may share a row equally. The
  primary button is left-aligned under the form in the app and full width on auth pages.

## 9. Auth pages

Every auth route (`/login`, `/get-started`, `/reset-password`, `/verify-email`, `/invitations/accept`,
`/auth/google`) uses `AuthShell`. No marketing header.

- **Frame**: a white form column on the left (about 46%) with the mark and "PixlPush" top-left (the mark has
  a fixed 32px height and its own width; never force both) a quiet "Back to home" text button
  top-right of the column, and a quiet footer line. On the right, a brand
  panel on `var(--pp-hero)`, inset 12px with a 16px radius. Below 1024px the panel is hidden and the form is
  the whole page.
- **Brand panel**: an overline, a 32px headline, one sentence, a white "product glimpse" card built from
  real UI (a three-step journey with a status chip), and three short points. Copy is chosen by `mode`
  (`login`, `signup`, `invite`, `security`). Facts only: never invent testimonials, customer names, logos,
  ratings or usage numbers.
- **Form block** (`.auth-block`, 400px wide): a 24px `h1`, one line of secondary text, the Google button
  first, an "or" divider, floating-label fields 16px apart, a full-width 44px primary button whose label is
  the action ("Log in", "Create account", "Send reset link", "Set new password"), then the switch link.
- **Password**: `PasswordField` with show/hide; where a password is being chosen, `PasswordRule` shows the
  rule ("At least 12 characters") and turns green when met.
- **Status screens** use `AuthStatus`: a 48px icon tile (accent, success, warning or error), the title, a
  line of text and one action. Used for check-your-inbox, verified, invalid or expired link, password
  updated and ended invitations.
- **Signing in** (`GoogleCallback`): centred in the column, the mark inside a ring that fills with the three
  steps and turns green at the end, a live step label, and a three-row checklist joined by a connector.
- First field is autofocused; every field has the right `autocomplete`.

## 10. Motion

- 150ms `cubic-bezier(.2,.6,.2,1)` (`--pp-ease`) on colour, border, shadow and small transforms: hover,
  press, row hover, switch, chip colour.
- The tab pill slides in 200ms. Auth blocks rise 8px in 300ms on load.
- **Field focus has no transition**: it must look active the instant it is clicked.
- Looping animation is allowed only where something is genuinely in progress (the signing-in ring and its
  current-step halo, a spinner). Nothing else loops, floats or bounces.
- Animate transform and opacity only for anything that loops.
- `prefers-reduced-motion` turns animations and slides off.

## 11. Responsive

- ≥ 1024px: auth brand panel visible.
- ≥ 900px: fixed sidebar, grids, full-width tables.
- 600–899px: grids drop to two columns; tables scroll inside their surface.
- < 600px: one column, sidebar as an overlay, 16px gutters, primary actions full width.
- No horizontal page scroll at any width. Tab tracks and tables scroll inside themselves.

## 12. Do and don't

**Do**
- Start from the theme; add to the theme when something is missing.
- Use floating labels, `SearchField`, MUI `Tabs`, `ReusableDataTable`, `AuthShell`, `AuthStatus`.
- Keep one primary action per view.
- Show loading with skeletons and loading rows.
- Check a new screen at 1440px and 390px, with real and empty data.

**Don't**
- Style a control at its call site, or write a hex colour in a screen.
- Use weights above 600, text under 11px, or app headings above 24px.
- Add underlined tabs, boxed tab buttons, pill-shaped buttons or fields, or a second tab look.
- Add shadows to cards, glow rings to fields, or any gradient other than `var(--pp-hero)`.
- Disable or grey out controls because data is loading.
- Show the last tab's or last search's rows while the next loads.
- Hand-build a search box, toggle, switch or status screen that already exists.
- Restyle email content, or change the email editors' colours.

## 13. Working on the UI

1. Read this file, then `lib/theme.ts`.
2. This repo has a knowledge graph: run `graphify query "<question>"` before grepping, and
   `graphify update .` after changing code.
3. Change order: tokens → theme overrides → the design layer in `app/globals.css` → the screen. If the same
   value appears in two screens, it belongs in the theme.
4. Visual work does not touch APIs, routes, state or business logic, and adds no dependencies.
5. Keep labels, roles and aria-labels that tests rely on, or update the tests in the same change.
6. Before finishing: `npx tsc --noEmit` passes, the tests pass, and the screen has been looked at.

**Checklist for any screen**

- [ ] Fields and dropdowns are 40px with floating labels; nothing is sized at the call site.
- [ ] Tabs are the sliding pill bar; search is `SearchField`.
- [ ] Only weights 400/500/600 and sizes from the scale.
- [ ] No hex colours, shadows on cards, or new gradients.
- [ ] Loading, empty and error states exist; nothing is disabled because of loading.
- [ ] One primary action; header matches the other screens.
- [ ] Works at 1440px and 390px with no sideways page scroll.

## 14. Known gaps

- Some screens still carry older inline colours (purple-tinted borders and fills, coloured icon tiles) in
  `DashboardSections.tsx`, `EmailWorkspace.tsx`, `PushComposer.tsx`, the Billing screens and the marketing
  pages. Replace them with tokens when touching those files.
- Forms are not yet capped to a readable width; settings forms fill their card.
- The top-bar search and the second Email list search are not connected to data.
- The campaign review screen's sender, recipient count and "Send campaign" are placeholders, and its
  preheader is not saved.
- Tabs built from plain buttons do not exist any more; if arrow-key navigation is needed, use MUI `Tabs`.
- Not yet reviewed on screen at phone width: most dashboard screens.
