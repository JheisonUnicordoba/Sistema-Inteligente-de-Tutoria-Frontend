# TutorIA Saber Pro — Frontend

React 18 + Vite 5 + TypeScript frontend for the intelligent tutoring system.

## Quick Start

1. Enter the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at [http://localhost:5173](http://localhost:5173)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all TS/TSX files |
| `npm run format` | Auto-format source files with Prettier |

## Project Structure

```
src/
  components/       # Shared/reusable components
    ProtectedRoute.tsx
  lib/
    api.ts          # Axios instance with auth interceptors
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx
    NotFoundPage.tsx
  App.tsx           # Router configuration
  main.tsx          # Application entry point
  index.css         # Tailwind base styles
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

## Tech Stack

- **React 18** — UI library
- **Vite 5** — Build tool and dev server
- **TypeScript** — Static typing
- **Tailwind CSS v3** — Utility-first styling
- **React Router DOM v6** — Client-side routing
- **Axios** — HTTP client with interceptors
- **ESLint + Prettier** — Linting and formatting
