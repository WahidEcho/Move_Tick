# Move Beyond — Event Operating System

A production-grade, multi-tenant event SaaS platform built with Next.js, Supabase, and TypeScript. Supports public event discovery, attendee registration, organizer operations, invitation workflows, QR-based check-in/out, sub-space management, redeem entitlements, and platform administration — all within a single unified web application.

## Tech Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript** (strict, no `any`)
- **Supabase** (Auth, Database, RLS, Storage-ready, Realtime-ready)
- **Tailwind CSS v4**
- **shadcn/ui v4**
- **React Hook Form + Zod** (form validation)
- **TanStack Query** (client-side data fetching)
- **Recharts** (analytics charts)
- **Lucide Icons**
- **papaparse** (CSV processing)
- **qrcode** (QR generation)
- **sonner** (toast notifications)

## Architecture Overview

### Three Experiences, One Application

| Experience | Route Group | Description |
|---|---|---|
| **Public / Attendee** | `/(public)` | Event discovery, registration, authentication |
| **Attendee Dashboard** | `/(attendee)` | Tickets, invitations, profile management |
| **Organizer Dashboard** | `/(organizer)` | Event creation, attendee management, operations |
| **Platform Admin** | `/(admin)` | Organizer approvals, platform governance |

### User Types

- **Public User / Attendee** — Browse events, register, manage tickets
- **Organizer Applicant** — Apply to become an organizer
- **Organization Team** — Owner, Admin, Manager roles
- **Event Staff** — Event Manager, Gate Scanner, Space Controller, Redeemer, Support
- **Platform Admin** — Approve organizers, manage platform

A single user can hold multiple roles simultaneously.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier works)

### 1. Clone and Install

```bash
cd Move-Tech
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get these values from your Supabase project dashboard under **Settings > API**.

### 3. Set Up Database

Run the SQL schema in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/schema.sql` from this project
4. Run the entire script

This creates all tables, indexes, triggers, and Row Level Security policies.

### 4. Create Admin User

After running the schema, sign up through the app, then promote yourself to admin:

```sql
UPDATE profiles SET platform_role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (public)/              # Public pages (home, events, auth)
│   │   ├── page.tsx           # Landing page
│   │   ├── events/            # Event listing and detail
│   │   ├── login/             # Authentication
│   │   ├── signup/
│   │   └── apply-organizer/   # Organizer application form
│   ├── (attendee)/            # Attendee dashboard
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   ├── invitations/
│   │   └── profile/
│   ├── (organizer)/           # Organizer dashboard
│   │   └── organizer/
│   │       ├── overview/
│   │       ├── events/
│   │       │   ├── new/       # Create event
│   │       │   └── [id]/      # Event management
│   │       │       ├── invitations/
│   │       │       ├── attendees/
│   │       │       ├── tickets/
│   │       │       ├── spaces/
│   │       │       ├── redeems/
│   │       │       ├── team/
│   │       │       ├── analytics/
│   │       │       └── settings/
│   │       └── settings/
│   ├── (admin)/               # Platform admin
│   │   └── admin/
│   │       ├── applications/
│   │       ├── organizations/
│   │       ├── events/
│   │       ├── users/
│   │       └── analytics/
│   └── api/auth/              # Auth callback
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/                # Shared layouts (headers, sidebars, cards)
│   ├── forms/                 # Form components (fields, CSV upload, multi-select)
│   ├── tables/                # Data table, pagination, filters
│   └── charts/                # Bar, line, funnel charts
├── lib/
│   ├── supabase-browser.ts    # Browser Supabase client
│   ├── supabase-server.ts     # Server Supabase client
│   ├── supabase-admin.ts      # Service role client
│   ├── auth.ts                # Auth helpers (requireAuth, requireAdmin, etc.)
│   ├── permissions.ts         # Role-based permission utilities
│   ├── validations.ts         # Zod schemas for all forms
│   ├── constants.ts           # App constants, categories, status colors
│   ├── helpers.ts             # Date formatting, slug generation, QR helpers
│   ├── notifications.ts       # Email/WhatsApp notification abstraction
│   ├── providers.tsx          # React context providers
│   └── hooks/
│       └── use-auth.ts        # Client-side auth hook
├── services/                  # Data access layer
│   ├── organizerApplications.service.ts
│   ├── organizations.service.ts
│   ├── events.service.ts
│   ├── invitations.service.ts
│   ├── attendees.service.ts
│   ├── tickets.service.ts
│   ├── eventMovements.service.ts
│   ├── spaces.service.ts
│   ├── redeems.service.ts
│   ├── team.service.ts
│   └── analytics.service.ts
├── types/
│   ├── database.types.ts      # Database entity types
│   ├── domain.types.ts        # Business logic types
│   └── ui.types.ts            # UI component types
├── middleware.ts               # Route protection
└── supabase/
    └── schema.sql             # Complete database schema
```

## Key Features

### Public Platform
- Event discovery with search, category, and city filters
- Event detail pages with ticket selection and registration
- Organizer application flow with multi-step form

### Attendee Dashboard
- View upcoming and past events
- Access QR tickets
- Manage invitations (accept/decline)
- Profile management

### Organizer Dashboard
- Organization overview with key metrics
- Event creation and management
- **Invitations Module**: CSV upload with validation, bulk import, funnel analytics, resend controls
- **Attendee Management**: Full CRUD, status management, presence tracking, export
- **Ticket Types**: Create/edit ticket types with capacity, pricing, visibility
- **Spaces Module**: Sub-areas with capacity, occupancy tracking, registration modes
- **Redeems Module**: Entitlement management, ticket type mapping, balance tracking
- **Team Management**: Staff invitation by email, role assignment, space assignment
- **Event Analytics**: Registration trends, attendance charts, invitation funnels
- **Event Settings**: Approval rules, social proof toggles, feature flags

### Platform Admin
- Organizer application review (approve/reject/request info)
- Organization management
- Event oversight
- User management
- Platform analytics

### Attendance Engine
- QR-based check-in/check-out with re-entry support
- Movement history tracking per attendee
- Live presence status (inside/outside/never arrived)
- Auto-checkout at event end
- Space-level occupancy tracking

### Invitation Workflow
- CSV upload with validation, duplicate detection, preview
- RSVP-first flow: invitation → confirmation → ticket + QR
- Email and WhatsApp delivery readiness
- Invitation funnel analytics
- Resend controls for failed/pending

## Database Schema

The schema includes 19 tables with full RLS policies:

| Table | Purpose |
|---|---|
| `profiles` | User profiles with platform roles |
| `organizations` | Multi-tenant organization records |
| `organization_members` | Org membership with roles |
| `organizer_applications` | Application workflow |
| `events` | Event records |
| `event_settings` | Per-event configuration flags |
| `ticket_types` | Ticket definitions with capacity |
| `tickets` | Issued tickets with QR |
| `registrations` | Registration records with status |
| `event_invitations` | Invitation records with RSVP |
| `event_movements` | Main gate check-in/out log |
| `spaces` | Sub-areas within events |
| `space_registrations` | Space pre-registrations |
| `space_movements` | Space entry/exit log |
| `event_staff_assignments` | Staff role assignments |
| `redeem_items` | Redeemable entitlements |
| `ticket_type_redeems` | Ticket-to-redeem mappings |
| `ticket_redeem_balances` | Per-ticket redeem balances |
| `redeem_logs` | Redemption history |

## Notification Architecture

The notification layer (`lib/notifications.ts`) provides a provider abstraction ready for:

- Email (SendGrid, Resend, AWS SES)
- WhatsApp Business API
- Custom providers

Notification types supported:
- Approval emails
- Organizer welcome
- Event invitations
- Registration confirmations
- Ticket delivery
- Terms & conditions

## Mobile Scanner Readiness

The backend architecture is designed for mobile scanner integration:

- QR token-based scanning API via `eventMovements.service.ts`
- `processQRScan()` handles full scan workflow
- Space-level scanning via `spaces.service.ts`
- Redeem scanning via `redeems.service.ts`
- Staff role verification per scan type

## Future Enhancements

The architecture supports extending with:

- Supabase Realtime for live dashboards
- Edge Functions for webhook processing
- Storage for file uploads (covers, avatars)
- Payment integration for paid tickets
- Push notifications
- Chat/networking features (flags already in place)
- Referral tracking (flag already in place)

## License

Private — All rights reserved.
