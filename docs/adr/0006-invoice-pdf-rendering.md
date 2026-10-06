# 0006. Invoice PDFs with @react-pdf/renderer on node_modules React

- Status: accepted
- Date: 2026-10-07

## Context

Invoices need a downloadable PDF that matches the on-screen paper document.
Options were headless Chrome (print the HTML page) or `@react-pdf/renderer`.
Headless Chrome adds a large binary and a process to manage. react-pdf runs
in-process and produces small, text-based PDFs.

Inside Next.js route handlers, JSX compiles against Next's vendored React.
react-pdf ships as an external package whose reconciler uses `node_modules/react`.
That reconciler silently ignores elements from the vendored instance:
`renderToBuffer` fails with `Cannot read properties of null (reading 'props')`.

## Decision

- Render PDFs in a route handler (`/api/invoices/[id]/pdf`), auth-checked and
  scoped to the owner, with `Cache-Control: private, no-store`.
- Build the PDF tree with `createElement` from the React that react-pdf uses,
  resolved at runtime via `createRequire` (`src/features/invoices/pdf/node-react.ts`),
  instead of JSX.
- Use the Geist TTFs from the `geist` package so the PDF uses the app's
  typeface. Turn off ligatures (`liga: false`): Geist's "fi" glyph has no
  Unicode mapping, so copied text would lose letters. Turn on tabular figures.
- Colors are the paper tokens converted to sRGB hex. WebP logos are skipped,
  because react-pdf only draws PNG and JPEG.

## Consequences

- The PDF layout is written as `h()` calls rather than JSX: more verbose, but
  explicit about which React it targets.
- Changes to the paper document should be mirrored in `invoice-pdf.ts`. The
  e2e test downloads a PDF and the route test checks its header and metadata.
