# Multi-Tenant Appointment & Booking SaaS

This repository implements a multi-tenant booking SaaS application. The app includes:

- Business signup/login with JWT auth
- Tenant-scoped dashboard data access
- Public booking pages by slug
- Service configuration and business hours
- Slot generation based on service duration and business schedule
- Booking creation with server-side revalidation and overlap protection
- Booking status changes, cancellation, and rescheduling
- Client CRM/search data
- Billing-state simulation and reminder job endpoints

## Architecture

- **Frontend**: React + Vite (Deployed on Vercel)
- **Backend**: Express (Deployed on Vercel Serverless Functions)
- **Auth**: JWT-based tenant context in the API layer
- **Database**: Supabase (PostgreSQL)

## Tech stack

- React 19
- Vite
- Express 4
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

## Core features

### Public booking flow

- Business lookup by slug
- Service list and price display
- Date-based availability fetch
- Slot selection
- Client details capture
- Booking creation
- 409 conflict handling when a slot is taken concurrently

### Business dashboard

- Overview metrics
- Bookings list
- Status transitions (confirm / complete / cancel / no-show)
- Service management
- Business hours configuration
- Client search and CRM view
- Billing status + payment-plan simulation
- Reminder job endpoint for follow-up notifications
