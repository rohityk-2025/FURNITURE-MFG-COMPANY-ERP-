# ERP Styling Guide

This project now uses a shared rounded UI language for admin and manager pages.

## Core files

- `frontend/src/index.css`
  Shared tokens and reusable classes.
- `frontend/src/components/ui.jsx`
  Shared React UI helpers used by forms, lists, modals, and badges.

## Design direction

- Forms use section blocks similar to the admin add-product form.
- Buttons use rounded pill corners instead of square edges.
- Tables and lists use the same shell, toolbar, header, row, and badge styling.
- Admin and manager pages should reuse the same primitives unless a page has a strong product-specific reason not to.

## Shared CSS tokens

Defined in `frontend/src/index.css`:

- Colors:
  - `--bg`, `--bg2`, `--bg3`
  - `--card`, `--card2`
  - `--border`, `--border2`
  - `--text`, `--text2`, `--text3`
  - `--primary`, `--primary-strong`, `--primary-bg`, `--primary-text`
  - `--secondary`, `--secondary-bg`
  - `--green`, `--green-bg`
  - `--red`, `--red-bg`
  - `--yellow`, `--yellow-bg`
  - `--orange`, `--orange-bg`
- Radius:
  - `--radius-xs`
  - `--radius-sm`
  - `--radius`
  - `--radius-lg`
  - `--radius-pill`
- Shadow:
  - `--shadow`
  - `--shadow-md`
  - `--shadow-lg`

## Shared classes

Use these instead of page-specific inline styles when possible.

- Buttons:
  - `btn-primary`
  - `btn-secondary`
  - `btn-danger`
  - `btn-success`
  - `btn-ghost`
  - `icon-button`
- Form elements:
  - `input`
  - `label`
  - `form-shell`
  - `form-section`
  - `form-section-title`
  - `form-actions`
- List and table surfaces:
  - `list-shell`
  - `list-toolbar`
  - `list-summary-grid`
  - `table-th`
  - `table-td`
  - `table-row`
- Cards and stats:
  - `card`
  - `card-sm`
  - `stat-card`
  - `stat-value`
  - `stat-label`
- Tags:
  - `badge-blue`
  - `badge-purple`
  - `badge-green`
  - `badge-yellow`
  - `badge-red`
  - `badge-orange`
  - `badge-gray`
- Filters:
  - `filter-pill`
  - `filter-pill active`

## Shared React helpers

Exported from `frontend/src/components/ui.jsx`:

- Layout and sections:
  - `PageHeader`
  - `Modal`
  - `FormSection`
  - `DetailGrid`
  - `StatCard`
- Status and formatting:
  - `StatusBadge`
  - `fmt`
  - `fmtDate`
  - `fmtDateTime`
- Common UX:
  - `LoadingPage`
  - `EmptyState`
  - `SearchBar`
  - `Tabs`
  - `Confirm`
  - `Avatar`

## Recommended page structure

For a CRUD page:

1. `PageHeader`
2. Optional `list-summary-grid`
3. `list-shell`
4. `list-toolbar`
5. table using `table-th`, `table-td`, `table-row`
6. `Modal` with `form-shell`
7. one or more `FormSection`
8. `form-actions`

## Rules for future UI work

- Reuse shared classes before adding inline styles.
- Keep admin and manager pages visually matched unless role-specific UX requires a difference.
- Prefer `StatusBadge` or shared badge classes for status/category tags.
- Prefer `PageHeader` for top page titles and actions.
- Prefer `Modal` plus `FormSection` for data-entry forms.
- Prefer `list-shell` and `list-toolbar` for table/list pages.
- If a new style is needed in more than one page, move it into `index.css` or `ui.jsx`.
