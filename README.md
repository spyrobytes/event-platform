# Event Platform

A modern, SEO-first event platform for creating, discovering, and managing events with invitations, RSVPs, and transactional communication.

Domains:
1. eventsfixer.com
2. eventsfixer.ca

---

## 🎯 Goal

Build a **lightweight, scalable event platform** that supports:

* Event creation and publishing
* Public discovery (SEO-friendly)
* Invitations and RSVP tracking
* Reliable transactional email delivery

The platform prioritizes **developer experience (DX)**, **performance**, and **cost efficiency** during early-stage growth.

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

* **Frontend**: Next.js 15+ (App Router) + React 19 + TypeScript
* **Hosting**: Vercel or Firebase Hosting
* **Database**: Supabase Postgres (with Prisma ORM)
* **Auth**: Firebase Authentication
* **Backend**: Next.js Route Handlers + Firebase Functions v2 (async workers)
* **Email**: Mailgun (transactional delivery)
* **Async Jobs**: Google Cloud Tasks + Cloud Scheduler
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

� **Ready for Implementation**

Architecture decisions finalized. See [IMPLEMENTATION-STRATEGY.md](./IMPLEMENTATION-STRATEGY.md) for comprehensive technical details.

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
│   ├── (public)/    # Public routes (discovery, event pages)
│   └── api/         # API endpoints
├── components/       # React components
│   ├── ui/          # Primitive components
│   ├── forms/       # Form components
│   └── features/    # Feature-specific components
├── lib/             # Utilities (db, auth, email, tokens)
├── schemas/         # Zod validation schemas
└── emails/          # React Email templates
```

---

> This README provides a high-level overview.
> Refer to linked documentation for implementation details.
