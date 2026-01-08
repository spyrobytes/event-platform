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

## 🛠️ Proposed Tech Stack (Initial)

* **Frontend**: Next.js (App Router, static generation)
* **Hosting**: Firebase Hosting
* **Database**: Firestore (structured event & RSVP data)
* **Backend**: Firebase Cloud Functions v2 (Cloud Run)
* **Email**: Mailgun (transactional)
* **Styling**: TailwindCSS + scoped CSS Modules
* **Content (optional)**: Headless CMS (Sanity) for blog/editorial content

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

🟡 **Planning & Design Phase**
Architecture, DX standards, and styling strategy are being finalized.

---

> This README is intentionally minimal.
> Expect rapid iteration as architecture and features solidify.
