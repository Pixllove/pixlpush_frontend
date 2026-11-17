# Forms module: full review, rebuild plan and UI/UX prompt

Reviewed 2026-11-17 in Chrome at `https://localhost:3000/dashboard/forms` and `/dashboard/forms/create`.
Files: `components/dashboard/FormsWorkspace.tsx` (227 lines), `components/dashboard/FormCreateWorkspace.tsx`
(634 lines), `app/globals.css` (forms block from line 12683), `lib/theme.ts`, `DESIGN.md`.

Goal: every control works end to end on a local data layer, the UI is restyled to `DESIGN.md`, and the
only thing left for the API phase is swapping the repository functions for HTTP calls.

---

## 1. Full review (each item tested in the browser unless marked "code")

### 1.1 Forms list (`/dashboard/forms`)
| # | Control | Result |
|---|---|---|
| L1 | Tabs Pop-ups / Embedded / Promotions with counts | Works |
| L2 | Status select (All / Active / Drafts / Paused) | Works |
| L3 | Search + empty state | Works, but empty state is hand-built (DESIGN.md says use `EmptyState`, "nothing matches" with "Clear search") |
| L4 | **Filters** button | Does nothing |
| L5 | **View analytics** button | Does nothing |
| L6 | Rename / Duplicate / Delete menu + dialogs | Work, but lost on reload (in-memory `demoForms`) |
| L7 | **Overview / Continue editing** | Both open an empty `/create`; no form id, nothing loads |
| L8 | Previous / Next | Always disabled (no pagination) |
| L9 | No status toggle (Active/Paused), no per-form stats page, no embed code access after creation | Missing |
| L10 | Delete dialog shows dev text "This frontend preview does not affect backend data" | Remove |
| L11 | Created forms never appear in the list | Nothing is saved |
| L12 | Late onboarding banner pushes the page down (layout shift) | Global, note only |

### 1.2 Create wizard (steps 1–5)
| # | Step / control | Result |
|---|---|---|
| W1 | Step 1 name | Empty / whitespace blocks continue (good). Name is not trimmed ("   QA review form" shown in Setup) |
| W2 | Step 1 type radios | Work. Accessible names are raw values "popup"/"embedded" |
| W3 | Step 2 groups | **Can continue with zero groups.** Groups are hard-coded. **Add new group** does nothing |
| W4 | Step 3 template picker | Category counts are fake ("Spin to win 4" → "No templates found", "Lead generation 14" → 2). Space on a card scrolls the page. "Need full control?" box is not clickable |
| W5 | Step 3 → editor | **Selected template is ignored**; editor always opens the same default form |
| W6 | Stepper on narrow screens | Overflows / cuts "Behaviour" |
| W7 | Back from Behaviour | Goes to template picker, skips editor |
| W8 | Editor "Back to setup" | Label wrong; goes to template picker |
| W9 | Leaving editor | **All editor state is destroyed** (state lives inside `FormEditor`) |
| W10 | Leaving Behaviour | **All behaviour state is destroyed** (state lives inside `BehaviourStep`) |
| W11 | Form type | Ignored everywhere after step 1: embedded forms get pop-up type, backdrop, wait/exit-intent triggers and a `</head>` install instruction |

### 1.3 Editor: top bar
| # | Control | Result |
|---|---|---|
| E1 | Subscribe form / Success message toggle | Switches canvas only |
| E2 | **Preview** | Does nothing |
| E3 | Done editing | Goes to Behaviour (state lost, see W9) |
| E4 | No undo/redo, no save state, no device preview (desktop/mobile) | Missing |
| E5 | Dashboard sidebar behind the full-screen editor is still keyboard reachable (19 links) | a11y bug |

### 1.4 Editor: elements (left panel + canvas)
| # | Element | Result |
|---|---|---|
| B1 | All 9 add buttons | Add a block at the end, always above the fields. **No reorder, no drag, no duplicate, no insert position** |
| B2 | Heading / Text | Only content text editable. No size, colour, alignment, weight. Text is plain, no links/bold |
| B3 | Image | Placeholder only. **No upload, no alt text, no link, no width** |
| B4 | Image & text | Placeholder only, same as Image |
| B5 | Button | Label only. **No URL / action, no colours** |
| B6 | Divider | Line nearly invisible; no colour, thickness or spacing |
| B7 | Countdown | **Fake static 02/14/36**. No end date, does not tick, no expired behaviour |
| B8 | Social icons | **Fake f / in / ◎ glyphs**, no platforms, no URLs |
| B9 | **Code (custom HTML)** | **Shows raw markup as text, never renders it**. No preview, no sandbox, no syntax area |
| B10 | Delete icon on every block | Works. Remove button also in inspector |
| B11 | Fixed blocks (title, intro text, disclaimer) | Intro paragraph and "By subscribing…" disclaimer are hard-coded and not editable/removable |
| B12 | Canvas | Tall forms are clipped at the top and cannot be scrolled to (`place-items:center` overflow) |
| B13 | Canvas at phone width | Broken: 72px left column truncates labels to "H…", canvas cut off, horizontal scroll |
| B14 | Left panel labels on xs collapse but icons have no tooltips | a11y |

### 1.5 Editor: Design panel
| # | Control | Result |
|---|---|---|
| D1 | Pop-up type centered/left/right/top/bottom | These are really *sidebar positions*, not pop-up types. **Top and Bottom render identically** (band at bottom both times) |
| D2 | Width slider | Works (360–620). No numeric input; split layout silently forces 620 |
| D3 | Background colour | Works. **Text colours do not adapt and cannot be set** (dark bg = unreadable title/body) |
| D4 | Background image | Works via FileReader → base64 data URL in state (too heavy for an API payload) |
| D5 | Corners slider | Works; `rounded` state duplicated |
| D6 | Shadow switch | Works |
| D7 | Layout centered/split | Works but duplicates D1; "centered" uses a history/restore icon |
| D8 | Style Default / Boxed | Boxed only adds a 1px border — no visible "box" |
| D9 | Sidebar background / image / Fit-Fill | Work |
| D10 | Include text | Shows hard-coded "Join the community"; not editable |
| D11 | **Show on mobile** | Just fades the canvas to 72% opacity — meaningless |
| D12 | Backdrop colour / opacity | Work (only meaningful for pop-ups) |
| D13 | Missing vs MailerLite | Fonts, heading/body/button/input styles, close button style, pop-up kinds (lightbox, slide-in, floating bar, full screen), embedded display (default / horizontal / card), alignment, transparent background |
| D14 | Colour control | Swatch only, hex not typeable |

### 1.6 Editor: Settings panel
| # | Control | Result |
|---|---|---|
| S1 | Fields list | Email fixed. **Add field only ever adds "First name" then "Company"**, then silently nothing. No field types, labels, placeholders, required flag, reorder (drag handle is decoration) |
| S2 | Removing a selected field | Leaves the inspector pointing at a field that no longer exists |
| S3 | Show labels above inputs | **Label renders inside the box**, not above |
| S4 | Privacy policy / Confirmation checkbox / Marketing permissions / Interest groups / Hidden field / reCAPTCHA | Toggles work, inner inputs are uncontrolled (values not stored), and **none of them appear on the canvas** |
| S5 | Success: view / URL | View cannot be edited anywhere; URL input uncontrolled, not validated |
| S6 | Success canvas | Fixed "Thank you!" text; clicking it selects nothing |
| S7 | All switches | Accessible name is "on" (no label association). Settings panel accordions are hand-built |
| S8 | Missing vs MailerLite | Double opt-in, coupon on success, field "sample text", GDPR permission list content |

### 1.7 Behaviour step
| # | Control | Result |
|---|---|---|
| H1 | Wait N seconds | **Value stuck at 5** (no onChange) |
| H2 | Scroll % | Works but uncontrolled |
| H3 | Exit intent | Works |
| H4 | Frequency | **Accepts "abc"** |
| H5 | Schedule "Specific time" | **No date/time inputs appear** |
| H6 | Visibility "Hide/Show on specific pages" | **No URL list input, no strict-match option** |
| H7 | Hide on desktop/mobile/tablet | Uncontrolled; can hide on all three |
| H8 | Embedded / promotion | Same pop-up triggers shown for embedded forms (wrong) |
| H9 | Radios | Accessible name "on"; schedule radios unlabeled |

### 1.8 Setup / publish step
| # | Control | Result |
|---|---|---|
| P1 | Snippet | `data-form="new-form"` hard-coded; form name injected unescaped into an HTML comment |
| P2 | Embedded forms | Told to paste in `</head>`; no placement `<div>`, no HTML code option, no share URL |
| P3 | Copy button | Shows success even when clipboard is missing; rejection unhandled |
| P4 | No status (Draft/Active) toggle, no "Publish" | Missing |
| P5 | Dev text "This frontend preview saves your form…" | Remove |

### 1.9 Styling vs `DESIGN.md`
- Editor overrides `MuiTabs` with an underline style (`globals.css` `.form-editor-workspace .MuiTabs-root`) — DESIGN.md: *sliding pill tabs, no underline*.
- Switches are bare `<Switch>` without `FormControlLabel` → no accessible name, inconsistent row alignment, mixed `size="small"`.
- Hand-built accordions, empty states, colour pickers, toggle tiles instead of shared components.
- One-line JSX of 2,000+ characters per line — unreviewable; must be split.
- Mixed spacing (`.65`, `.85`, `1.35`, `1.7`) instead of the spacing scale; inline `sx` everywhere.
- Hard-coded colours inside the canvas (`rgba(30,20,41,.12)`, `#eeeeee`).

---

## 2. MailerLite reference (what "complete" looks like)

From MailerLite help: [pop-up form](https://mailerlite.com/help/how-to-create-a-pop-up-form),
[embedded form](https://mailerlite.com/help/how-to-create-an-embedded-form),
[promotion pop-up](https://www.mailerlite.com/help/how-to-create-a-promotional-pop-up),
[pop-ups feature page](https://mailerlite.com/features/popups),
[pop-up feature updates](https://mailerlite.com/blog/pop-up-feature-updates).

- **Flow:** name + type → groups (at least one) → template or blank → editor → Done editing → behaviour (pop-ups/promotions) → install → set Active.
- **Editor:** left = Elements + Style (brand font, colours, typography); canvas with hover pencil/settings per block, drag reorder; right = selected block / form settings; top bar = Form ↔ Success, Done editing.
- **Blocks:** Heading, Text, Image, Image & text, Video, Button, Divider, List, Countdown, Social links (+ promotions: spin the wheel, teaser).
- **Pop-up design:** type (lightbox, slide-in, floating bar top/bottom, full screen, big sidebar), width, background, corner radius, layout (plain, border, top sidebar, left/right sidebar, boxed).
- **Embedded design:** display (default, horizontal, card), page background (incl. transparent), form width/border/radius/alignment, content fonts, input/label/checkbox styles, button colours/hover/radius.
- **Settings:** fields (add, edit sample text, reorder), privacy policy, confirmation checkbox, GDPR marketing permissions, interest groups, hidden segmentation field, reCAPTCHA.
- **Success:** editable message; embedded can redirect to a custom URL.
- **Behaviour:** trigger (delay, scroll %, exit intent, click), frequency (for non-subscribers), schedule (now or start/end dates), visibility (all pages / hide on / only show on — one URL per line, "strict equality"), hide per device.
- **Install:** pop-ups via site script; embedded via JS snippet or HTML code tab, plus a share URL; forms have a status that must be Active.

---

## 3. Rebuild plan

Principles: one typed draft model, one renderer used everywhere, no new dependencies (MUI, zod,
react-hook-form, vitest are already installed), follow `DESIGN.md` exactly.

### Phase 0 — Model and data layer (fixes W9, W10, L6, L7, L11)
- `components/dashboard/forms/model.ts`: `FormDraft` zod schema + types (`kind`, `name`, `groups`, `template`,
  `design`, `blocks[]`, `fields[]`, `options`, `success`, `behaviour`, `status`, `stats`, timestamps),
  `defaultDraft(kind, template)`, and a `draftReducer` with undo/redo history.
  This schema is the contract for the API phase.
- `lib/forms.ts`: repository `listForms / getForm / saveForm / deleteForm / duplicateForm`, backed by
  `localStorage` (try/catch) for now. API phase replaces only this file (React Query hooks around it).
- Routes: `/dashboard/forms/create` creates a draft and redirects to `/dashboard/forms/[id]/edit?step=…`;
  step lives in the URL so refresh and Back work. List rows link to the real id.
- Wizard owns the draft; every step reads/writes it; autosave with "Saved" indicator.
- Templates become real `defaultDraft` presets (blocks + design) per kind; category counts computed.

### Phase 1 — Shared renderer (fixes B9, B12, S3, S4, S6, D1, D3, D11)
- `FormRenderer.tsx`: pure render of a draft (form or success view) used by editor canvas, Preview dialog,
  list thumbnails and the HTML export. Canvas wraps it with selection outlines only.
- Options render for real: privacy text, consent checkbox, marketing permissions, interest group choices,
  reCAPTCHA badge, labels above inputs.
- Custom code block: rendered in a sandboxed `<iframe srcDoc sandbox="allow-scripts">` that auto-sizes; editor
  is a monospace multiline field with an HTML/Preview toggle. No sanitizer dependency needed because the
  iframe is isolated (no `allow-same-origin`).
- `renderFormHtml(draft)`: static HTML+inline CSS export for the "HTML code" install tab.
- Canvas scrolls correctly (top alignment with padding), device toggle desktop / tablet / mobile width.

### Phase 2 — Editor functionality
- **Blocks:** insert after selected, drag reorder (native HTML5 DnD) + move up/down buttons for keyboard,
  duplicate, delete, select. Intro text and disclaimer become normal removable blocks.
- **Per-block inspector:**
  - Heading/Text: text, alignment, size, colour, weight; links in text.
  - Image / Image & text: upload (object URL now, upload API later), alt, link, width, alignment, side.
  - Button: label, action (submit / open URL), URL, colours, radius, full width.
  - Divider: colour, thickness, spacing.
  - Countdown: end date-time (`datetime-local`), live ticking, labels, "on expire: hide / show text".
  - Social: platform list with URLs (reuse `SocialPlatformIcon` from `SimpleEmailEditor.tsx`), size, alignment.
  - Code: HTML editor + sandboxed live preview.
  - Add **List** and **Video** blocks (MailerLite parity).
- **Fields:** add from a type menu (text, email, phone, number, dropdown, checkbox, date, hidden), label,
  placeholder, required, width (full/half), reorder, remove; Email always present and required.
- **Style tab** (form-level): font family, heading/body/label colours, input style (bg, border, radius),
  button style (bg, hover, text colour, radius), close button (pop-up/promotion).
- **Kind-specific design:**
  - Pop-up: type lightbox / slide-in (corner) / floating bar (top/bottom) / full screen; layout plain /
    border / top sidebar / left / right sidebar / boxed (real boxed look); backdrop colour + opacity; width.
  - Embedded: display default / horizontal / card, alignment, transparent background, width.
  - Promotion: centred / corner / bottom banner, close button, overlay.
- **Success:** editable heading, text, optional button and coupon code, or redirect URL (validated `https://`).
- **Settings options** fully controlled and stored: privacy text with link, consent text, permission list,
  interest groups (multi), hidden field name/value, reCAPTCHA, double opt-in.
- **Top bar:** undo/redo, save status, Preview (full-screen dialog with working fake submit → success view),
  Done editing. Back goes to the previous step without data loss.

### Phase 3 — Behaviour, setup, list
- Behaviour: all controlled + zod validated; delay seconds, scroll %, exit intent, click trigger; frequency
  number ≥ 1; schedule start/end `datetime-local` (end > start); page rules = textarea one URL per line +
  "strict match"; device hides (cannot hide all three). Embedded forms skip triggers (only schedule).
- Setup: per kind — pop-up/promotion: JS snippet with real form id; embedded: JS snippet + placement
  `<div data-pixlpush-form="id">`, HTML code tab (from `renderFormHtml`), share URL. Name escaped.
  Copy with try/catch + toast. Status switch Draft → Active. Remove dev text.
- List: data from repository; status toggle; real "Overview" page (stats, embed code, behaviour summary,
  edit / duplicate / delete); Filters either real (date, groups) or removed; View analytics → analytics page;
  client pagination; `EmptyState` with the three DESIGN.md reasons.

### Phase 4 — Restyle to DESIGN.md (all UI)
- Split into `components/dashboard/forms/`: `FormsListPage`, `FormWizard`, `steps/*`, `editor/{EditorShell,
  ElementsPanel, Canvas, Inspector, StylePanel, SettingsPanel}`, `FormRenderer`, `model.ts`.
- Shared inspector primitives: `InspectorSection` (collapsible, MUI Accordion styled per DESIGN.md),
  `SettingSwitch` (themed `Switch` inside `FormControlLabel`, label left / switch right, optional description,
  correct accessible name), `ColorField` (swatch + editable hex text field), `NumberSlider` (slider + number
  input with unit), `SegmentedControl` (themed `ToggleButtonGroup size="small"`), `ImageField`.
- Remove the editor's underline `MuiTabs` override; use the theme's sliding pill tabs.
- Remove all hand-built tiles/empty states; use `EmptyState`, `DeleteConfirmDialog`, `SubmitButton`.
- Spacing on the theme scale only; no hard-coded colours outside the renderer's user-chosen values.
- Editor below `md`: left and right panels become bottom-sheet drawers toggled from the top bar;
  canvas full width. Wizard stepper becomes "Step 2 of 5 · Subscriber groups" on xs.
- Accessibility: every control labelled, radios grouped with `RadioGroup` + `FormLabel`, focus trap in the
  editor (sidebar `inert`), icon-only buttons have tooltips + `aria-label`, cards keyboard-selectable without
  page scroll.

### Phase 5 — Verify
- `tests/forms-model.test.ts` (vitest): reducer (add/move/duplicate/remove block, undo/redo), zod validation
  (behaviour, success URL, groups ≥ 1), `renderFormHtml` escaping, repository round trip.
- Browser pass in Chrome: re-run every row of section 1 at 1440px and 390px; console clean.
- `npm run lint`, `npm test`, `graphify update .`.

Out of scope (API phase): real groups, uploads, stats, publishing, reCAPTCHA keys, double opt-in emails.

---

## 4. UI/UX prompt (hand to a designer/engineer or an AI agent)

> You are rebuilding the **Forms** module of PixlPush, a Next.js 14 + MUI 6 dashboard. Follow `DESIGN.md`
> and `lib/theme.ts` exactly: 40px fields with floating labels, sliding pill tabs (no underline), themed
> `Switch`, `EmptyState`, `DeleteConfirmDialog`, accent `var(--pp-accent)`, spacing on the theme scale.
> No new dependencies.
>
> **Product bar:** match MailerLite's form builder for pop-ups, embedded forms and promotions. Every
> visible control must change the saved draft and the live canvas; nothing may be decorative.
>
> **Flow:** Forms list (tabs Pop-ups / Embedded / Promotions, status filter, search, pagination, status
> toggle, row menu Rename / Duplicate / Delete, Overview) → Create: 1 Details (name, type) → 2 Subscriber
> groups (≥1, create group inline) → 3 Template or blank (real templates per type, real counts) → Editor →
> 4 Behaviour (pop-up/promotion only) → 5 Install & activate. Step is in the URL; Back never loses data;
> autosave with a visible "Saved" state.
>
> **Editor layout (desktop):** dark 56px top bar (back, form name, Form ↔ Success segmented control,
> device preview desktop/tablet/mobile, undo/redo, save state, Preview, Done editing). Left 264px panel with
> tabs Elements | Style. Centre canvas on a dotted neutral background, top-aligned and scrollable, showing the
> form exactly as visitors will see it (backdrop only for pop-ups). Right 320px inspector: shows the selected
> block's settings, or form settings when nothing is selected, with a "Form" breadcrumb back.
> On tablet/mobile the side panels become bottom sheets.
>
> **Canvas interactions:** hover shows a block toolbar (drag handle, move up/down, duplicate, delete) and a
> label chip with the block type; click selects (2px accent outline); drag to reorder with an insertion line;
> new blocks insert after the selection. Keyboard: arrows move selection, Delete removes, Ctrl/Cmd+Z/Y undo.
>
> **Blocks and their inspector:** Heading, Text (alignment, size, colour, weight, links), Image (upload, alt,
> link, width), Image & text (side, image, text), Button (label, submit or URL, colours, radius), Divider
> (colour, thickness, spacing), Countdown (end date-time, ticks live, on-expire behaviour), Social links
> (platform + URL rows), List, Video, Custom code (monospace HTML editor with HTML/Preview toggle, rendered in a
> sandboxed iframe on the canvas).
>
> **Fields:** typed fields (text, email, phone, number, dropdown, checkbox, date, hidden) with label,
> placeholder, required, half/full width, reorder; Email is mandatory.
>
> **Style tab:** font, heading/body/label colours, input style, button style, close button. Kind-specific
> design: pop-up type (lightbox, slide-in, floating bar top/bottom, full screen) + layout (plain, border, top
> sidebar, left/right sidebar, boxed) + width + backdrop; embedded display (default, horizontal, card),
> alignment, transparent background; promotion position (centre, corner, bottom banner).
>
> **Settings:** privacy policy text + link, consent checkbox text, GDPR marketing permissions list, interest
> groups, hidden segmentation field, reCAPTCHA, double opt-in — each visibly rendered on the canvas when on.
> **Success:** editable heading/text/button/coupon, or validated redirect URL.
>
> **Controls style:** inspector sections are collapsible with 12px uppercase overline titles; every boolean is
> a labelled row (label + optional 12px description left, themed Switch right, whole row clickable, accessible
> name = label); colours are swatch + editable hex field; numeric values are slider + number input with unit;
> either/or choices are `ToggleButtonGroup size="small"`; position choices are icon tiles with tooltips.
>
> **Behaviour:** trigger (delay seconds, scroll %, exit intent, on click), frequency (≥1 days/weeks/months),
> schedule (now / start–end date-time, end after start), visibility (all pages / hide on / only on: one URL per
> line + strict match), hide on desktop/tablet/mobile (not all three). Inline validation messages.
>
> **Install:** JS snippet with the real form id; embedded adds a placement `<div>`, an HTML code tab and a
> share URL; copy shows a toast and handles failure; status switch Draft → Active.
>
> **Quality:** WCAG AA contrast (warn in the inspector when text/background contrast fails), every control
> labelled, focus trapped in the editor, no layout shift, works at 390px, no console errors.

---

## 5. Decisions needed before executing
1. **Local persistence until the API exists:** `localStorage` repository (recommended — reload-safe, swap file
   later) or in-memory only.
2. **Custom code rendering:** sandboxed iframe (recommended — isolates scripts/CSS from the dashboard) or
   sanitised inline HTML.
3. **Scope order:** Phases 0 → 5 in sequence (recommended; each phase is a commit you can review), or Phase 4
   restyle first.
