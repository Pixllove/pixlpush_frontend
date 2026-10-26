# pixlpush_frontend

## Local API setup

The Next.js frontend runs on `https://localhost:3000` and forwards authenticated
API requests to the Fastify backend at `http://localhost:4000/api/v1`.

Start both services for dashboard data, notifications, support, projects, and
other authenticated features to work:

```bash
# Terminal 1 — from pixlpush_backend
npm run dev

# Terminal 2 — from pixlpush_frontend
npm run dev
```

Copy `.env.example` to `.env.local` and set `BACKEND_GATEWAY_SECRET` to the
same value as the backend's `API_GATEWAY_SECRET`. The backend must also have a
working `DATABASE_URL`; the frontend cannot serve authenticated data when the
backend or its database is unavailable.
