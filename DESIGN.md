# Workbench design system

Calm, precise, expensive. The reference bar is Linear, Vercel, Stripe Dashboard,
Mercury, and Things 3: we take their restraint and precision, not their look.
Every `ui/*` branch follows this document. Values live in
`src/app/globals.css`; this file explains intent.

## Principles

1. **Restraint.** Neutrals carry about 95% of the interface. There is one accent,
   used only for primary actions, focus, and active state. Luxury is what we leave
   out: few sizes, few weights, few shadows.
2. **Precision.** Everything sits on the 4px grid. Edges line up across header,
   toolbar, and table. Optical details like tabular numbers, real minus signs,
   and concentric radii are not optional.
3. **Typography is the hierarchy.** Size, weight, and tone (primary, muted,
   subtle) guide the eye. We do not reach for boxes, badges, or color to make
   something important.
4. **Considered density.** Overview pages breathe. Tables and lists are compact
   and efficient. Padding is chosen per context, never one value everywhere.
5. **Quiet until needed.** Row actions, helper text, and secondary controls
   appear on hover, focus, or demand. The default state is calm.

## Typography

- **Geist Sans** for the entire interface, invoices, and PDFs.
- **Geist Mono** only for identifiers: invoice numbers, IDs, secrets, hosts.
- No serif. The decision is final; contrast comes from size and weight.
- Weights: 400 (body), 500 (labels, emphasis, buttons), 600 (titles, figures).

| Token  | Size / line | Use                                          |
| ------ | ----------- | -------------------------------------------- |
| `2xl`  | 40 / 44     | Single hero figure (dashboard net), −0.025em |
| `xl`   | 28 / 34     | Summary figures, invoice total, −0.02em      |
| `lg`   | 20 / 28     | Page titles, −0.01em                         |
| `md`   | 16 / 24     | Section and dialog titles                    |
| `base` | 14 / 22     | Body copy, descriptions                      |
| `sm`   | 13 / 20     | Tables, controls, labels, most UI text       |
| `xs`   | 12 / 16     | Column headers, hints, captions              |

- Every money figure and numeric column uses `tabular` (tabular numerals) and
  is right-aligned. Negative amounts use a true minus (−).
- Large headings get the negative tracking above. Body text keeps the generous
  line height above.

## Color

OKLCH tokens, cool neutrals (hue 260) and an ink-blue accent. Tailwind's default
palette is removed: if a token is not listed here, it does not exist.

| Token            | Light                    | Dark                     | Role                                     |
| ---------------- | ------------------------ | ------------------------ | ---------------------------------------- |
| `background`     | `oklch(0.975 0.002 260)` | `oklch(0.155 0.004 260)` | App canvas, sidebar                      |
| `surface`        | `oklch(0.995 0.001 260)` | `oklch(0.185 0.005 260)` | Content panel, inputs, tables            |
| `surface-raised` | `oklch(0.998 0.001 260)` | `oklch(0.225 0.006 260)` | Menus, popovers, dialogs                 |
| `fill`           | `oklch(0.955 0.003 260)` | `oklch(0.26 0.006 260)`  | Hover, selection, skeletons              |
| `fill-strong`    | `oklch(0.925 0.004 260)` | `oklch(0.3 0.007 260)`   | Pressed, active                          |
| `border`         | `oklch(0.915 0.003 260)` | `oklch(0.265 0.006 260)` | Hairline dividers                        |
| `border-strong`  | `oklch(0.85 0.005 260)`  | `oklch(0.34 0.008 260)`  | Control outlines                         |
| `text` (`fg`)    | `oklch(0.22 0.006 260)`  | `oklch(0.93 0.004 260)`  | Primary text                             |
| `text-muted`     | `oklch(0.45 0.008 260)`  | `oklch(0.74 0.008 260)`  | Secondary text, labels                   |
| `text-subtle`    | `oklch(0.53 0.008 260)`  | `oklch(0.64 0.008 260)`  | Tertiary text, placeholders, hints       |
| `accent`         | `oklch(0.5 0.13 258)`    | `oklch(0.7 0.12 258)`    | Primary action, focus ring, active state |
| `success`        | `oklch(0.52 0.12 155)`   | `oklch(0.72 0.13 155)`   | Paid, income, healthy                    |
| `warning`        | `oklch(0.6 0.13 70)`     | `oklch(0.79 0.12 75)`    | Due soon (dots and icons only)           |
| `danger`         | `oklch(0.52 0.18 27)`    | `oklch(0.7 0.16 25)`     | Overdue, destructive, errors             |

Documents (the invoice preview, the print page, and the PDF) use **paper**
tokens: `paper`, `ink`, `ink-muted`, `ink-subtle`, `rule`, `rule-strong`. They
are never redefined for dark mode, so an invoice looks the same on screen in
either theme, on paper, and as a PDF, the way a PDF viewer shows a white page.

Rules:

- **Contrast is tested.** `src/lib/design-tokens.test.ts` checks that every
  text token reaches WCAG AA (4.5:1) on every surface, that the accent reaches
  3:1 as a focus ring, and that no token is pure black or white.
- **Dark mode is designed, not inverted.** Elevation gets lighter as layers
  rise (background → surface → raised). Borders are slightly lighter than the
  surfaces they divide. Text is off-white, and saturated colors are lifted so
  they don't vibrate.
- **Semantic colors mean something.** Success, warning, and danger appear as a
  6px status dot, an icon, error text, or a destructive button. Never as large
  tinted areas, pills, or decoration. Income amounts may use `success`.
- **Charts** use the accent for the series that matters and neutrals for
  everything else, with direct labels. No legends where a label fits, and no
  rainbows.

## Spacing

A 4px grid. Allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (Tailwind
`1 2 3 4 5 6 8 10 12 16`). `0.5` (2px) is reserved for optical nudges inside
small controls.

- Page gutter: `--gutter` (16px mobile, 32px from 768px). Page headers, toolbars,
  and the first and last table cells use it, so text lines up vertically
  down the page.
- Overview pages: 32–48px between sections.
- Tables: 44px rows, 36px header, 12px cell padding.
- Forms: 20px between fields, 6px between label and control.

## Radius

One system. Nested elements follow inner = outer − padding.

| Token | Value | Use                                                      |
| ----- | ----- | -------------------------------------------------------- |
| `xs`  | 4px   | Nested items (segments, kbd, skeleton bars)              |
| `sm`  | 6px   | Buttons, inputs, menu items, small controls              |
| `md`  | 10px  | Menus, popovers, panels (menu items: 10 − 4 padding = 6) |
| `lg`  | 14px  | Dialogs, the main content panel                          |

## Surfaces and elevation

- Separate with 1px hairline borders and subtle tone shifts, never shadows.
- Shadows exist only for layers that float: `shadow-popover` (menus, popovers,
  toasts, the active segment), `shadow-dialog` (dialogs, command palette), and
  `shadow-drag` (a card being dragged). Each is soft and layered, with a
  hairline ring built in.
- No glass, no backdrop blur, no gradients.

## Motion

- 120–200ms, ease-out (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
- Purposeful only: hover and press feedback (a 1px press), dialog and popover
  enter/exit, board drag feedback, number and list changes.
- Exits are faster than entrances (120ms vs 160–200ms).
- `prefers-reduced-motion` collapses all motion to instant.
- No bouncing, parallax, looping decoration, or skeleton shimmer faster than
  1.6s.

## Iconography

- Lucide only, stroke width 1.5 everywhere (set globally).
- 16px in controls, navigation, and tables; 20px for empty and error states.
- Icons support labels; they rarely replace them. Icon-only buttons always have
  an `aria-label` and usually a tooltip.

## Components

- **Buttons.** One primary button per view. Secondary is outlined; ghost is for
  toolbars and row actions. Loading keeps the width and shows a spinner.
- **Forms.** Labels above controls. Required is the default; optional fields
  say "Optional". Hints sit below and are replaced by the error while invalid.
  Validate inline on blur and on submit. Focus is a 2px accent outline.
- **Tables.** First-class: sticky header, row hover, right-aligned tabular
  numbers, quiet row actions on hover or focus, roving keyboard navigation
  (↑ ↓ j k Home End Enter), and server pagination with "1–25 of 132".
- **Status.** Plain text with a small dot. No badges or pills.
- **Empty states.** One line of useful copy, an optional second line, and at
  most one action. No illustrations.
- **Loading.** Skeletons that match the final layout's geometry.
- **Errors.** Calm and specific about what failed. Say the data is safe when
  it is. Offer one way forward.
- **Command palette.** `⌘K` / `Ctrl K` for navigation and quick-add.

## Voice

- Short, specific, human. Sentence case everywhere, including buttons and
  titles.
- No exclamation marks, no filler ("Oops!", "Awesome!", "Welcome back 👋"), no
  emoji.
- Name the thing: "Add transaction", not "Submit". "Delete credential?", not
  "Are you sure?".
- Empty states tell you what will appear and how to make it appear.
- Errors explain what happened and what to do, never internals.

## Hard bans

Purple/blue-to-pink gradients, gradient text, glowing blobs, decorative grid or
noise backgrounds. Glassmorphism and backdrop blur. Emoji as icons or in
headings. Greeting copy. Identical shadowed cards in a three-column grid.
Centered marketing heroes inside the app. Unmodified shadcn defaults. Rainbow
charts. Filler content (lorem ipsum, "Acme Inc.", fake testimonials, stock
illustrations). Mixed icon sets or stroke widths. Badges, pills, and tinted
backgrounds on everything.

## Review process

1. `/styleguide` (development only) shows every token and component in both
   themes. Update it when you add or change a component.
2. Before merging a `ui/*` branch, run the visual harness against the dev server:

   ```sh
   PW_BASE_URL=http://localhost:3000 VISUAL_PATHS=/path,/other npm run test:visual
   ```

   It writes screenshots at 390, 768, and 1440px in light and dark mode to
   `artifacts/screenshots/` and fails on any axe violation. Review every
   screenshot against this document, fix spacing, alignment, and contrast, then
   capture again. Never merge on the first pass.

3. The commit body records what was checked and what was adjusted.
