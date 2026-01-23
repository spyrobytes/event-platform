# Event Platform - EventFXr

A modern, SEO-first event platform for creating, discovering, and managing events with invitations, RSVPs, and transactional communication.

Domains:
1. eventfxr.com
2. eventfxr.ca
3. eventsfixer.com
4. eventsfixer.ca

---

## 🎯 Goal

Build a **lightweight, scalable event platform** that supports:

* Event creation and publishing
* Public discovery (SEO-friendly)
* Invitations and RSVP tracking
* Reliable transactional email delivery

The platform prioritizes **developer experience (DX)**, **performance**, and **cost efficiency** during early-stage growth.

##  🧩 Philosophy

- Core: **narrative-first pages**, **smart defaults**, **temporal behavior**, and **modular components**
- Page Flow: Story-driven **event pages** with **editorial photography** and **structured sections**
- UX: **intuitive editor**, **live previews**, and **easy sharing**
- Guidance: We are building an editorial, crafted, respectful experience — not a page builder.


## 🛠️ Core workflow:

1. Organizer creates event
2. Organizer sends invitations
3. Invitee RSVPs via secure link (magic token)
4. Reminders and confirmations via email
5. Dashboard with analytics & insights

---

## 🧭 Intended Scope

### Core Capabilities

* Public event pages (indexable, crawlable)
* Event metadata (date, time, location, description)
* Invitation + RSVP workflow
* Transactional email (invites, confirmations, updates)

### Non-Goals (for now)

* Ticketing & payments
* Complex seat management
* Native mobile apps
* Real-time chat or social features

---

## 🧱 Architectural Principles

* **SEO-first**: Multi-page, statically generated pages where possible
* **Serverless-lean**: Pay-per-use backend with minimal operational overhead
* **Composable stack**: Best-of-breed tools that integrate cleanly
* **Iterative delivery**: MVP → feedback → incremental expansion

---

## 🛠️ Tech Stack

### Core Infrastructure

* **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
* **Hosting**: Vercel
* **Database**: Supabase Postgres (with Prisma ORM)
* **Auth**: Firebase Authentication
* **Backend**: Next.js Route Handlers
* **Email**: Mailgun (transactional delivery) + React Email
* **Async Jobs**: Vercel Cron
* **Styling**: Tailwind CSS v4 + CSS Modules

### Key Libraries

* **Validation**: Zod
* **Forms**: React Hook Form + @hookform/resolvers
* **Email Templates**: React Email
* **Testing**: Vitest + Testing Library + Playwright
* **Icons**: Lucide React
* **Date Handling**: date-fns + date-fns-tz

---

## 🚀 MVP Target

**Deliver a production-ready MVP that allows:**

* Creating and publishing events
* Rendering SEO-optimized public event pages
* Sending invitations via email
* Capturing and persisting RSVPs
* Viewing basic RSVP counts per event

**Constraints:**

* ≤ 100 events in year one
* Low infrastructure cost
* Simple operational model
* Clear upgrade paths for future features

---

## 📈 Post-MVP Considerations (Not Implemented Yet)

* Paid events / ticketing
* Admin dashboard & analytics
* Event templates
* Organization / multi-host support
* Search & filtering
* iCal / Google Calendar integrations

---

## 📄 Status

**MVP Complete**

All core features implemented:

- Event creation, editing, publishing, and deletion
- SEO-optimized public event pages with dynamic sitemap
- Invitation system with unique token-based RSVP links
- RSVP submission and tracking
- Email delivery via Mailgun with webhook status tracking
- Firebase authentication with protected dashboard routes
- Rate limiting middleware
- Security headers (HSTS, CSP, X-Frame-Options)
- Health check endpoint for monitoring
- Comprehensive unit tests (57 tests passing)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Configure environment variables

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm test

# Type check and lint
npm run typecheck
npm run lint

# Production build
npm run build
```

---

## 📚 Documentation

* [Implementation Strategy](./IMPLEMENTATION-STRATEGY.md) — Architecture decisions & implementation guide
* [CSS Guidelines](./docs/css-implementation-guidelines.md) — Styling patterns & conventions
* [DX Strategy](./docs/event-platform-dx-implementation-strategy.md) — Developer experience details

---

## 🏗️ Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── (auth)/      # Protected routes (dashboard, event management)
│   ├── (marketing)/ # Public routes (discovery, event pages)
│   ├── api/         # API endpoints
│   └── rsvp/        # Token-based RSVP pages
├── components/       # React components
│   ├── ui/          # Primitive components
│   ├── forms/       # Form components
│   ├── features/    # Feature-specific components
│   └── providers/   # Context providers (Auth)
├── lib/             # Utilities (db, auth, email, tokens, rate-limit)
├── schemas/         # Zod validation schemas
├── hooks/           # Custom React hooks
└── proxy.ts         # Rate limiting proxy

tests/
├── unit/            # Unit tests (Vitest)
└── e2e/             # End-to-end tests (Playwright)

prisma/
├── schema/          # Prisma schema files
└── migrations/      # Database migrations
```

---

> This README provides a high-level overview.
> Refer to linked documentation for implementation details.
