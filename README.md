# Support Desk Frontend

Support Desk is the authenticated internal workspace for the IT support log system. It gives support teams a practical way to capture requests, coordinate ownership, follow resolution status, review workload, and export operational reports.

## Stack

- React 19 and React Router
- TypeScript 6 and Vite 8
- Axios API client
- Recharts for accessible operational charts
- Lucide React for interface icons
- Oxlint for linting

## Requirements

- Node.js 20.19 or newer
- npm
- The Laravel API running locally or remotely

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

## Environment

```dotenv
# Must include /api and must not include /v1.
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` is the base URL consumed by Axios. The frontend adds the versioned `/v1/...` paths itself. Before login, the frontend calls Sanctum's `/sanctum/csrf-cookie` endpoint, then Axios sends credentials, reads `XSRF-TOKEN`, and sends the `X-XSRF-TOKEN` header for browser requests. The frontend does not store authentication tokens in `localStorage` or `sessionStorage`.

The API must allow the configured frontend origin through `FRONTEND_URL` in the backend `.env`. Keep hostnames consistent when testing locally:

- `localhost:5173` → `localhost:8000`
- `127.0.0.1:5173` → `127.0.0.1:8000`

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build
npm run lint     # Run Oxlint
```

## Authentication and roles

- `/login` is outside the authenticated application shell.
- A bootstrap request to `GET /v1/auth/me` restores the current session.
- `POST /v1/auth/login` accepts `email`, `password`, and optional `remember`.
- `POST /v1/auth/logout` ends the session.
- A `401` clears the local auth state and returns to `/login`; a `403` is shown on the requesting page without signing the user out.
- Administrators see Dashboard, Support Logs, Create Log, My Work, Reports, and administration pages.
- Technical Resources see Support Logs, Create Log, and My Work. Administrators additionally see Dashboard, Reports, and administration. Client-side navigation is only a usability boundary; the API remains authoritative.

## API contract

The frontend consumes these versioned endpoints:

- `/v1/auth/login`, `/v1/auth/logout`, `/v1/auth/me`
- `/v1/support-log-options` for safe department, issue type, item type, and assignable-user lookups
- `/v1/support-logs` and `/v1/support-logs/:id`
- `/v1/dashboard/summary`
- `/v1/reports/by-department`, `by-resource`, `by-issue-type`, `by-item`, `by-status`, and `export`
- `/v1/departments`, `/v1/users`, `/v1/issue-types`, and `/v1/item-types`

Lists use Laravel pagination (`data`, `links`, `meta`). Support log filters use `date_from`, `date_to`, `department_id`, `issue_type_id`, `item_type_id`, `status`, `priority`, `assigned_to`, `initiated_by`, `ticket_number`, `search`, `per_page`, `page`, `sort_by`, and `sort_direction`. On support-log forms, `initiated_by` is submitted as the requester's free-text name; `department_id`, `item_type_id`, and `assigned_to` use API IDs, while related `department`, `item_type`, and `assigned_resource` values may be API resource objects and are normalized for display.

Canonical support enums are:

- Status: `open`, `in_progress`, `indoor_repair`, `outdoor_repair`, `resolved`, `closed`, `cancelled`
- Priority: `low`, `medium`, `high`, `critical`
- Role: `admin`, `technical_resource`

The UI handles Laravel 422 field errors beside the matching controls, common network failures, authorization errors, loading states, duplicate-submit prevention, and CSV downloads.

## Application routes

- `/login`
- `/` — administrator dashboard
- `/support-logs` — searchable, filterable support log queue
- `/support-logs/new` — create a support log
- `/support-logs/:id` — support log detail and assignment history
- `/support-logs/:id/edit` — edit a permitted support log
- `/my-work` — assigned work queue
- `/reports` — administrator reports and CSV export
- `/admin/users` — administrator user management
- `/admin/departments` — administrator department management
- `/admin/configuration` — administrator issue/item option management

## Accessibility and responsive behavior

The application includes semantic landmarks, skip navigation, visible focus, keyboard-operable dialogs and tabs, accessible form labels and error summaries, status text alternatives for charts, reduced-motion support, light/dark themes, and table-to-card layouts for narrow screens. Interactive controls use a minimum 44px target where the shared control system applies it.

There is no frontend test harness configured in this repository. Use `npm run lint` and `npm run build` for static verification, and exercise authentication and CRUD flows against a running API. Attachments are intentionally not part of v1; status/priority values are code-defined, while issue/item options are administrator-managed.
