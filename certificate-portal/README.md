# Certificate Portal

A full-stack certificate management system with three role-based logins —
**Admin**, **Teacher**, and **Student** — built on Angular 19.2.27, Express,
and MySQL.

```
certificate-portal/
  client/   Angular 19 frontend (login page + 3 role dashboards)
  server/   Express + MySQL backend (auth, CRUD, PDF generation, bulk zip)
```

## What each role can do

**Admin**
- Create, update, delete, and view all student records
- **Bulk-add students** by uploading a CSV/Excel file (columns: `name`,
  `registerNumber`, `email`, `course`)
- **Bulk-add teachers** by uploading a CSV/Excel file (columns: `name`,
  `email`, `password`, optional `department`)
- **Bulk-delete students** by selecting rows via checkboxes and deleting them
  all at once
- Verify/un-verify whether a student is a legitimate record
- Create teacher accounts, **edit any teacher's details** (name, email,
  department, and optionally reset their password), verify/un-verify
  teachers, and control which teachers are allowed to bulk-download
  certificates

**Teacher** (must be verified by an admin to log in)
- View all student records
- **Edit any student's details** (name, register number, email, course)
- Download a single student's certificate as a PDF
- Bulk download certificates by uploading a CSV or Excel file containing
  register numbers or emails (only if the admin has granted bulk-download
  permission) — returns a `.zip` of PDFs plus a report of any unmatched rows

**Student**
- Logs in with register number + email (no separate password, per your spec)
- Views their own certificate details and downloads their PDF

## Demo login credentials (from the seed data)

| Role | Credentials |
|---|---|
| Admin | username `admin` / password `admin123` |
| Teacher (verified, bulk-download allowed) | `anitha.kumar@college.edu` / `teacher123` |
| Teacher (pending verification, will be rejected until approved) | `ravi.shankar@college.edu` / `teacher123` |
| Student | register number `21CS001` / email `aarthi.selvam@student.edu` |

12 sample students are seeded (register numbers `21CS001`–`21CS012`); one
(`21CS011`) is intentionally left unverified to demonstrate the approval flow.

## Setup

See **RUNBOOK.md** for the full step-by-step procedure (versions, install,
configuration, and run commands for both client and server).

## Important security note

Per your request, this version uses **plain-text passwords** stored directly
in MySQL for speed of setup — there is no hashing (bcrypt) and no JWT. This
is fine for a local coursework/demo build but should **not** be used as-is
for anything handling real people's data. If you want, I can upgrade this
later to hashed passwords + JWT sessions without changing the rest of the
architecture.

## Design system

The web app (login page + all three dashboards) uses a soft, minimalist
lavender theme:

- **Palette**: light lavender background (`#E8DFF5`), deep violet text
  (`#2A1F40`), a medium-violet primary (`#4A3B6B`) for buttons and confirmed
  states, a muted lilac accent (`#8B7AB5`) reserved for decorative/hover use,
  a pale surface tone (`#DDD0EE`) for cards, and a soft gray-violet border
  (`#C4C1CE`) for hairlines.
  - **Color-theory note**: Accent (`#8B7AB5`) measures ~2.9:1 contrast
    against the background — below the 4.5:1 WCAG AA threshold for text.
    So Accent is used only for decorative/large-scale elements (hover
    washes, borders, focus states on bigger controls), never as small
    solid-fill text. Primary (`#4A3B6B`) carries all text-bearing
    interactive surfaces instead, since white-on-Primary measures ~9.9:1.
  - One correction from the original spec: Surface was written as
    `#DDDOEE` (letter O); the RGB values given (221, 208, 238) convert to
    `#DDD0EE` (zero), which is what's implemented.
- **Type**: Montserrat (headings/display, weight 600) + Google Sans
  (body/UI, weight 450), both variable fonts self-hosted as local `.ttf`
  files in `client/public/fonts/`.
- **Signature detail**: minimal borders, whisper-soft shadows (per
  Minimalism/Swiss-style guidance — no shadow unless it earns its place),
  generous whitespace, and a thin Accent-colored rule available as a
  headline underline detail (`headline-rule` mixin).
- All tokens live as CSS custom properties in `client/src/styles.scss`;
  component styles reference them via `var(--token-name)` and the shared
  mixins in `client/src/app/shared/_design-system.scss`.

This is intentionally a different visual language from the **certificate
PDF itself**, which uses its own aurora-glass dark theme (see below) — a
formal certificate and a day-to-day admin UI don't need to match
pixel-for-pixel.

## Architecture notes

- Sessions are cookie-based (`express-session`), not JWT — simplest option
  for a same-machine client+server demo.
- The certificate PDF uses an aurora-glass dark theme: a navy gradient
  background with soft teal/violet/gold blooms, frosted glass panels (no
  blur/glow — approximated via layered opacity, since `pdfkit` can't do
  real backdrop blur), a gradient hairline rule, and a dedicated gold/navy
  crest (`server/assets/images/wu-crest-gold.png`) designed specifically
  for this dark palette — separate from the purple crest used in the web
  client (`client/public/images/wu-crest.png`), since a single logo colored
  for a light lavender UI didn't read well against the certificate's dark
  background. Both are cropped to just the shield/laurels/ribbon, excluding
  any wordmark text baked into the source art, since the app's own
  "Waterloo University" text already appears alongside the mark everywhere
  it's used. The logo is placed with `pdfkit`'s `fit` option, which scales
  proportionally within its bounding box rather than stretching to fill
  exact width/height — safe regardless of the source image's aspect ratio.
  Heading text uses Montserrat at weight 600 and body/label text uses Google Sans at weight 450/600 — since both are *variable* fonts and
  `pdfkit` can't use a variable font's weight axis directly, `fonttools` is
  used to bake real static instances at those exact weights
  (`server/assets/fonts/Montserrat-600.ttf`, `GoogleSans-450.ttf`,
  `GoogleSans-600.ttf`) rather than approximating. The signature is
  rendered in a separate custom script font
  (`server/assets/fonts/BillyArgel.ttf`). The same drawing code is used
  server-side for both single-student and bulk downloads, so every
  certificate looks identical regardless of which flow produced it.
- Bulk *download* (teacher) accepts either `.csv` or `.xlsx`/`.xls`, matched
  by a column named `registerNumber` (or `regNo`) or `email`
  (case/spacing-insensitive).
- Bulk *upload* (admin) uses the same flexible header matching:
  - Students file needs `name`, `registerNumber` (or `regNo`), `email`,
    `course` (must exactly match one of the 5 allowed course names) — an
    optional `issueDate` column is also honored.
  - Teachers file needs `name`, `email`, `password` — an optional
    `department` column is also honored.
  - Both bulk-upload endpoints skip (rather than fail the whole batch on)
    rows that are missing required fields, use an invalid course, or
    duplicate an existing/earlier-in-file record — and return a per-row
    reason for anything skipped so you can fix and re-upload just those rows.
- Bulk delete sends an array of student ids in one request
  (`POST /api/admin/students/bulk-delete`) rather than one DELETE call per
  row.
- A verified teacher can edit any student's core details (name, register
  number, email, course) but not their verification status or certificate
  ID — those stay admin-only, matching who's responsible for confirming a
  student's legitimacy.
