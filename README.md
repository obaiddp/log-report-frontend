# Log Report Frontend

React 19, TypeScript, and Vite frontend for the Log Report application. The starter screen checks the Laravel API health endpoint at startup.

## Requirements

- Node.js 20.19 or newer
- npm

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend is available at `http://localhost:5173` by default.

## Environment

```dotenv
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` must include the API prefix but not the versioned endpoint. The frontend requests `VITE_API_URL/v1/health`.

## Commands

```bash
npm run dev      # Start the development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build
npm run lint     # Run Oxlint
```

The Laravel backend must allow the frontend origin through its `FRONTEND_URL` CORS setting.
