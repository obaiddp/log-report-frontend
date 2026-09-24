# AssetOps Frontend

Responsive React frontend for the Asset Inspection Form application. The app opens directly to the operational dashboard and provides asset and inspection CRUD, reporting, CSV export, and administration of departments, technical personnel, and directory users.

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
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` must include `/api`, but must not include `/v1`.

The Laravel API allows the configured frontend origins through `FRONTEND_URL` in the backend `.env`. Keep the frontend and API hostnames consistent when testing locally:

- `localhost:5173` → `localhost:8000`
- `127.0.0.1:5173` → `127.0.0.1:8000`

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build
npm run lint     # Run Oxlint
```

## API endpoints

The frontend uses the public versioned endpoints:

- `/v1/assets`
- `/v1/inspections`
- `/v1/users`
- `/v1/departments`
- `/v1/technical-personnel`
- `GET /v1/reports/summary`
- `GET /v1/reports/export`

List endpoints return Laravel pagination (`data`, `links`, `meta`). Mutations use JSON and preserve Laravel 422 field errors beside the matching form controls. Singular resources are returned directly.

The frontend uses the backend's canonical snake-case values:

- Assets submit `user_id`, `type`, `brand`, `model`, `serial_number`, `ram`, `ram_gb`, `storage`, `asset_tag`, and `acquired_at`. Department ownership is derived from the selected user.
- Inspections submit `asset_id`, `problem_id`, `remarks`, `status`, `category`, `sub_category`, `technical_personnel_id`, and `inspection_date`. Repairs require `sub_category=in_house|out_house`; purchases send `null`.
- Technical personnel forms submit `department_id`, optional `email`, `phone`, `designation`, and `specialization`.
- Department forms submit `name`, optional `code`, `description`, and `status`.
- User forms submit `name`, `email`, `department_id`, `designation`, `territory`, `role`, and `status`.
- Daily report calls include `range=daily` and `date=YYYY-MM-DD`; weekly reports use `range=weekly`; custom reports use `date_from` and `date_to`. CSV export receives the same query parameters.

## Accessibility and responsive behavior

The application includes semantic landmarks, skip navigation, visible focus, keyboard-operable dialogs and tabs, accessible form errors, reduced-motion support, light/dark themes, chart text/table alternatives, and table-to-card layouts for narrow screens. Interactive controls use a minimum 44px target.
