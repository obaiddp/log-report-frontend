# AssetOps Frontend

Responsive React frontend for the Asset Inspection Form application. It provides Sanctum cookie authentication, asset and inspection CRUD workflows, operational reporting, CSV export, and administration of departments, technical personnel, and users.

## Stack

- React 19 and React Router
- TypeScript 6 and Vite 8
- Axios with Sanctum cookie/XSRF handling
- Recharts for accessible operational charts
- Lucide React for interface icons
- Oxlint for linting

## Requirements

- Node.js 20.19 or newer
- npm
- The Laravel API with Sanctum SPA authentication enabled

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

## Environment

```dotenv
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` must include `/api`, but must not include `/v1`. CSRF initialization is sent to `{VITE_API_URL origin}/sanctum/csrf-cookie`.

The Laravel API must allow the frontend origin and credentials. For local development, configure Sanctum stateful domains and CORS for `http://localhost:5173`. In production, a same-site deployment on the API domain is recommended so the browser can use the standard `XSRF-TOKEN` / `X-XSRF-TOKEN` flow.

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build
npm run lint     # Run Oxlint
```

## API expectations

The frontend uses the following versioned endpoints:

- `GET /sanctum/csrf-cookie`
- `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/auth/me`
- `/v1/assets`, `/v1/inspections`, `/v1/users`, `/v1/departments`, `/v1/technical-personnel`
- `GET /v1/reports/summary`
- `GET /v1/reports/export`

List endpoints return Laravel pagination (`data`, `links`, `meta`). Mutations use JSON and preserve Laravel 422 field errors beside the matching form controls. Singular resources are returned directly.

The frontend uses the backend's canonical snake-case values:

- Assets submit `user_id`, `type`, `brand`, `model`, `serial_number`, `ram`, `ram_gb`, `storage`, `asset_tag`, and `acquired_at`. Department ownership is derived from the selected user.
- Inspections submit `asset_id`, `problem_id`, `remarks`, `status`, `category`, `sub_category`, `technical_personnel_id`, and `inspection_date`. Repairs require `sub_category=in_house|out_house`; purchases send `null`.
- Technical personnel forms submit `department_id`, optional `email`, `phone`, `designation`, and `specialization`.
- Department forms submit `name`, optional `code`, `description`, and `status`.
- New users submit `name`, `email`, `department_id`, `designation`, `territory`, `role`, `status`, and `password`. Leaving the password empty on edit keeps the current password.
- Daily report calls include `range=daily` and `date=YYYY-MM-DD`; weekly reports use `range=weekly`; custom reports use `date_from` and `date_to`. CSV export receives the same query parameters.

## Seeded sign-in

- Email: `admin@logreport.test`
- Password: `password`

Administrators can manage all resources and inspections. Technicians can manage inspections and reports. Standard users have read-only asset and inspection access.

## Accessibility and responsive behavior

The application includes semantic landmarks, skip navigation, visible focus, keyboard-operable dialogs and tabs, accessible form errors, reduced-motion support, light/dark themes, chart text/table alternatives, and table-to-card layouts for narrow screens. Interactive controls use a minimum 44px target.
