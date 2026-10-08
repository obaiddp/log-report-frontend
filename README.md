# Support Desk: IT Support Log Frontend

Internal workspace for capturing, tracking, and reporting IT support logs. This is the React frontend; it needs the Laravel backend running (see the backend README).

## Tech stack

- React 19 + TypeScript (strict) + Vite
- React Router 7
- Tailwind CSS v4 with design tokens in `src/index.css` (light theme only)
- Radix UI primitives wrapped in `src/components/ui/`
- Recharts for dashboard charts
- lucide-react for icons
- Oxlint for linting

## Requirements

- Node.js 20.19 or newer, and npm
- The backend API running (default `http://127.0.0.1:8000`)

Check with `node -v` and `npm -v`.

## Quick start

1. **Start the backend first** (in the backend folder):

   ```bash
   php artisan serve
   ```

2. **Install and run the frontend:**

   ```bash
   npm install
   npm run dev
   ```

3. Open **http://localhost:5173** and sign in with a seeded account (the emails and passwords come from the backend seeders and `.env`; ask the project owner if unsure).

## Connecting to the backend

The API base URL is set in `src/lib/api.ts` (`API_URL`). Default: `http://127.0.0.1:8000`.

Authentication uses Laravel Sanctum cookies, so these must line up:

| Frontend | Backend `.env` |
|---|---|
| Opened at `http://localhost:5173` | `FRONTEND_URL=http://localhost:5173` |
| Host `localhost:5173` | `SANCTUM_STATEFUL_DOMAINS=localhost:5173` |

Use `localhost` or `127.0.0.1` consistently. Opening the app on one while the backend config says the other will break login. After editing the backend `.env`, run `php artisan config:clear`.

## Commands

```bash
npm run dev      # dev server with hot reload
npm run build    # type-check + production build (output in dist/)
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

## Routes

| Route | Page | Needs permission |
|---|---|---|
| `/login` | Sign in | none |
| `/` | Dashboard | any signed-in user |
| `/support-logs` | Support log table, filters, CSV export, create | any signed-in user |
| `/profile` | Current user profile | any signed-in user |
| `/admin/departments` | Department manager | `manage_departments` |
| `/admin/items` | Item types manager | `manage_item_types` |
| `/admin/issues` | Issue types manager | `manage_issue_types` |
| `/admin/users` | User management | `manage_users` |
| `/admin/roles` | Role permissions | `manage_roles` |

Sidebar items are filtered by the signed-in user's permissions, which come from `GET /api/auth/me`. The dashboard's **User performance** section only appears for users with `user_performance`.

If an admin changes a role's permissions, affected users must log out and back in to see the change.

## Project structure

```
src/
├── main.tsx                  # entry point, mounts AuthProvider
├── App.tsx                   # router setup and route guards
├── index.css                 # Tailwind import + theme tokens
├── context/AuthContext.tsx   # session state (login/logout/me)
├── config/navigation.ts      # sidebar items, filtered by permissions
├── lib/
│   ├── api.ts                # fetch client, API functions, entity types
│   ├── permissions.ts        # role/permission helpers
│   └── utils.ts              # cn()
├── components/
│   ├── layout/AppShell.tsx   # sidebar + topbar shell
│   ├── ProtectedLayout.tsx   # auth guard for protected routes
│   ├── EntityManager.tsx     # shared admin CRUD (departments/items/issues)
│   ├── SupportLogForm.tsx    # create-log form
│   └── ui/                   # shared primitives (button, card, dialog, ...)
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx     # stats, charts, user performance, recent logs
    ├── SupportLogsPage.tsx   # logs table, filters, CSV export, dialogs
    ├── ProfilePage.tsx
    ├── NotFoundPage.tsx
    └── admin/                # departments, items, issues, users, roles
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login fails or immediately logs out | `localhost` vs `127.0.0.1` mismatch; see "Connecting to the backend" |
| `419` errors | Backend `SANCTUM_STATEFUL_DOMAINS` does not include the frontend host and port |
| CORS error in the console | Backend `FRONTEND_URL` is missing the exact frontend origin |
| Network errors everywhere | Backend is not running, or `API_URL` in `src/lib/api.ts` is wrong |
| Admin menu item missing | The role lacks that permission; fix it in Roles & Permissions, then log in again |
| Port 5173 already in use | Vite picks the next port; update `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS` to match |
| `npm install` fails | Check the Node version (20.19+) |

## Deploying

```bash
npm run build
```

Serve the `dist/` folder from any static host. In production, set `API_URL` to the real backend URL, and set the backend's `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS` to the production frontend domain. For cookie auth, the frontend and API should share a parent domain (for example `app.example.com` and `api.example.com`) and use HTTPS.