# Multi-Tenant Appointment & Booking SaaS

This repository implements the assessment-spec booking SaaS as a focused local MVP that is intentionally easy to run and review. The app includes:

- Business signup/login with JWT auth
- Tenant-scoped dashboard data access
- Public booking pages by slug
- Service configuration and business hours
- Slot generation based on service duration and business schedule
- Booking creation with server-side revalidation and overlap protection
- Booking status changes, cancellation, and rescheduling
- Client CRM/search data
- Billing-state simulation and reminder job endpoints
- Demo seed data for two sample businesses

## Architecture

- Frontend: React + Vite
- Backend: Express + SQLite
- Auth: JWT-based tenant context in the API layer
- Database: SQLite for local reproducibility; designed to map cleanly to Postgres + RLS in production

## Tech stack

- React 19
- Vite
- Express 4
- better-sqlite3
- bcryptjs
- JWT auth

## Local setup

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm start
```

The API runs on:

- http://localhost:4000

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

The app runs on:

- http://localhost:5173

## Demo credentials

After seeding:

- Glow Hair Studio
  - Public URL: /booking/glow-hair-studio
  - Owner login: owner@glowhair.demo / demo1234
- Bright Smile Dental
  - Public URL: /booking/bright-smile-dental
  - Owner login: owner@brightsmile.demo / demo1234

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

### Tenant safety and scheduling correctness

- Business data is scoped by business_id in all tenant-protected API routes
- Availability generation rejects overlapping bookings and blocked periods
- Bookings are protected by a transaction-based slot check before insertion
- Reschedule validation uses the same overlap rules as a new booking

## Environment variables

### backend/.env.example

```dotenv
PORT=4000
JWT_SECRET=dev-secret-change-me
```

### frontend/.env.example

```dotenv
VITE_API_URL=http://localhost:4000
```

## Testing

```bash
cd backend
npm test
```

The test suite covers:

- signup + token creation
- tenant isolation
- invalid token rejection
- double-booking prevention
- cancellation freeing a slot

## Notes and trade-offs

This implementation follows the assessment spec in spirit but intentionally stays local-first for reliability in a coding environment without external services. The code is structured so the same design can be mapped to Postgres + Supabase RLS + Stripe + cron jobs in production.

Known limitations:

- Local SQLite instead of Supabase/Postgres
- JWT auth instead of Supabase Auth
- Simulated billing and reminder queue rather than real provider integration
- Booking environment is evaluated as a local app, not a live cloud deployment

## Future upgrades

- Replace SQLite with Supabase Postgres and RLS policies
- Add provider/resource scheduling and multiple staff calendars
- Add webhook-verified billing and subscription gating
- Add cron-based reminder automation and notification providers
- Add full calendar views and analytics
