# Multi-Tenant Appointment & Booking SaaS

This repository implements a premium multi-tenant booking SaaS application designed with a sleek, editorial aesthetic and a robust modular architecture.

## Features

- **Editorial Design System**: Flat, modern UI with Fraunces and Work Sans typography.
- **Professional State Management**: Fully integrated with `@tanstack/react-query` for flawless async state management, optimistic updates, and cache invalidation.
- **Modular API Architecture**: Controller and router-based Express backend using `express-async-errors` for centralized, crash-proof error handling.
- **Strict Payload Validation**: Full `zod` integration on all API endpoints to protect database integrity.
- **Tenant-Scoped Data**: JWT auth securely isolates business data and dashboard access.
- **Availability Engine**: Slot generation based on service duration, business schedule, and overlapping bookings.
- **Client CRM**: Native searchable client database with booking histories.

## Architecture

- **Frontend**: React + Vite + `@tanstack/react-query` (Deployed on Vercel)
- **Backend**: Express modular monolith with `zod` validation (Deployed on Vercel Serverless Functions)
- **Auth**: JWT-based tenant context in the API layer
- **Database**: Supabase (PostgreSQL)

## Tech stack

- React 19
- `@tanstack/react-query`
- Vite
- Express 4
- `zod`
- `express-async-errors`
- Supabase JS Client (`@supabase/supabase-js`)
- bcryptjs
- JWT auth

## Local setup

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit your `backend/.env` to include your Supabase credentials:
```dotenv
PORT=4000
JWT_SECRET=dev-secret-change-me
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

To seed the database with sample data:
```bash
npm run seed
```

Start the API:
```bash
npm start
```
The API runs on `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit your `frontend/.env`:
```dotenv
VITE_API_URL=http://localhost:4000
```

Start the dev server:
```bash
npm run dev
```
The app runs on `http://localhost:5173`.

## Deployment

Both the frontend and backend are optimized for deployment on Vercel as two separate projects.

### Backend Deployment
1. Import the repository into Vercel and set the Root Directory to `backend`.
2. Add the following Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`

### Frontend Deployment
1. Import the repository into Vercel and set the Root Directory to `frontend`.
2. Ensure the Framework Preset is set to Vite.
3. Add the following Environment Variable:
   - `VITE_API_URL` (Set to your deployed backend URL, e.g., `https://my-backend.vercel.app`)
