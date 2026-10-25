# Project rules for AI agents (log-report-frontend)

Read this file before every task. These rules override your defaults.

## What this app is
CEF365 Support Desk: React + TypeScript + Vite frontend for a Laravel API.
Modules: Dashboard, Support Logs, Asset Inspections, Departments, Item Types,
Issue Types, Users, Roles and Permissions.

## Stack (do not change)
- Vite, React, TypeScript, react-router.
- Tailwind CSS v4 + shadcn/ui components (src/components/ui). Style with Tailwind
  classes and the existing theme variables. No inline style objects (chart sizing
  excepted), no CSS modules, no CSS-in-JS.
- recharts for charts. Do not add dependencies unless the task says so.

## Hard rules
1. Backend is a separate repo. Never edit it. Never invent API fields or URLs.
2. src/lib/api.ts is the single API client. Do not edit it unless the task says so.
   If you think it has a bug, report it instead of changing it.
3. Access control uses PERMISSION NAMES only (hasPermission("...")). Never check role
   names ("admin", "ict_staff", ...) or department codes to show or hide anything.
4. Do not leave background processes running. If you start a dev server, stop it
   before you finish. Never leave a page that calls the API in a loop.
5. No console.log of auth data, user objects, tokens or session ids.
6. Do not commit, push, or run destructive git commands. The developer commits.
7. Do not delete files unless the task names them. List candidates and ask.
8. Touch only the files the task is about. Report every file you changed.

## Data facts
- Roles: super_admin, ict_manager, ict_staff, admin_approver.
- Permissions: manage_dashboard, dashboard_support_logs, dashboard_asset_inspections,
  user_performance, dashboard_department_view, dashboard_all_view, manage_support_logs,
  manage_asset_inspections, create_asset_inspections, manage_departments,
  manage_item_types, manage_issue_types, manage_users, manage_role_permissions.
- manage_users and manage_role_permissions belong to super_admin only. super_admin's own
  permissions cannot be edited (server returns 403).
- /api/auth/login returns { data, role, permissions }. /api/auth/me returns
  { user_from_request, role, permissions }.
- Asset inspection reads return prepared_by and admin_user as User OBJECTS. Read .id.
- Approver dropdown: getApprovers() (not getUsers, which is super_admin only).
- Dashboard endpoints take scope = mine | department | all and filters; the shapes are
  typed in src/lib/api.ts. Breakdown lists use { label, total } (status-like) or
  { id, name, total } (named). Map them explicitly before passing to chart components.

## React rules that prevent request loops
- An effect's dependency list may only contain primitives or values memoized with
  useMemo/useCallback. Never depend on an object, array or function created during render.
- Do not set state that is also a dependency of the same effect.
- Filters kept in the URL: write to the URL only when the serialized query differs
  from the current one.
- Every fetch effect must fetch once on mount, again only when real inputs change, and
  on the auto-refresh interval. Test by counting requests for 30 s with no input.
- Guard every value that may be null/undefined before calling string methods on it.
- Wrap each chart in an error boundary so one bad chart cannot blank the app.

## UI rules
- Mobile first. No horizontal page scroll at 360 px. Touch targets at least 44 px.
- Tables: shadcn Table, right-aligned tabular numbers, sensible empty states.
- Light and dark mode must both work (theme variables, no hard-coded colors).
- Colors in charts: var(--chart-N) and status colors from chart-colors.ts. Theme
  variables already hold complete colors, so never wrap them in hsl().
- Small forms (1 to 6 fields) open in a Dialog. Large forms stay full pages.

## Before you say you are done
Run, and report the results of:
- npx tsc -p tsconfig.app.json --noEmit
- npx oxlint
- npm run build
Then list every file you changed and anything you could not verify in a browser.