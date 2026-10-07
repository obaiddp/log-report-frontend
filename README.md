# Support Desk — IT Support Log Frontend

Internal workspace for capturing, tracking, and reporting IT support logs.

## Tech stack

- React 19 + TypeScript (strict) + Vite 8
- React Router 7 for navigation
- Tailwind CSS v4 with design tokens in `src/index.css` (light theme only)
- Radix UI primitives (dialog, dropdown-menu, tooltip) wrapped in `src/components/ui/`
- Recharts for dashboard charts
- lucide-react for icons
- Oxlint for linting

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

## Routes

| Route | Page |
|---|---|
| `/login` | sign in |
| `/` | dashboard |
| `/support-logs` | support log table (filters, CSV export, create) |
| `/profile` | current user profile |
| `/admin/departments` | department manager |
| `/admin/items` | item types manager |
| `/admin/issues` | issue types manager |
| `/admin/users` | user management |
| `/admin/roles` | role permissions |

Admin routes/nav items are filtered by the user's permissions from the API.

## Requirements

- Node.js 20.19+ and npm
- The Laravel backend running (default `http://127.0.0.1:8000`)

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

The API base URL is set in `src/lib/api.ts` (`API_URL`). Authentication uses
Laravel Sanctum with cookie credentials — keep the host consistent with the
backend's `FRONTEND_URL` (use `localhost` or `127.0.0.1` consistently).

## Commands

```bash
npm run dev      # dev server
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview production build
```
