# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sympli is a voice-first health memory platform built as a Progressive Web App. Patients log symptoms through guided chat conversations (using the SOCRATES clinical framework), and the system generates clinically structured PDF reports for GP appointments. The stack is Next.js 14 (App Router) with TypeScript, Tailwind CSS, Supabase (auth + database), and OpenAI API for adaptive question generation.

## Commands

```bash
npm run dev        # Start Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run clean      # Clear .next, node_modules cache, .vercel
```

There is no test suite configured. The project has no test runner or test files.

## Environment Variables

Required in `.env.local`:
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `OPENAI_API_KEY` — OpenAI API key for chat question generation and report summarisation

## Architecture

### Frontend (Next.js App Router)

- **`app/page.tsx`** — Landing page (public, marketing)
- **`app/layout.tsx`** — Root layout with Inter font, PWA meta tags, service worker cleanup
- **`app/providers.tsx`** — Client-side providers: React Query (`QueryClientProvider`), Radix `TooltipProvider`, toast notifications (Radix + Sonner)
- **`app/auth/page.tsx`** — Login/register page
- **`app/onboarding/page.tsx`** — Multi-step onboarding flow
- **`app/chat/page.tsx`** — Main symptom chat interface (the core product)
- **`app/symptoms/page.tsx`** — Symptom dashboard/management
- **`app/past-logs/page.tsx`** — Historical symptom log viewer
- **`app/settings/page.tsx`** — User settings
- **`app/timeline/page.tsx`** — Health history timeline view
- **`app/auth/callback/page.tsx`** — OAuth callback handler

### Components

Two component locations:
- **`app/components/`** — App-specific components: `SymptomChat.tsx` (core chat UI), `SymptomTimeline.tsx`, `SymptomDashboard.tsx`, `SymptomOverview.tsx`, auth forms, `UserNavigation.tsx`, onboarding steps (`onboarding/` subdirectory)
- **`components/ui/`** — Shared UI primitives (toast, tooltip, sonner) using Radix UI + `class-variance-authority`. Uses `lib/utils.ts` (`cn()` helper via `clsx` + `tailwind-merge`).

### API Routes (`app/api/`)

All API routes use Next.js Route Handlers. Auth is enforced via Bearer token in the Authorization header, validated against Supabase.

**Auth:** `auth/login`, `auth/register`, `auth/verify-email`, `auth/verify`, `auth/resend-verification`, `auth/google`, `auth/gdpr/delete`

**Symptoms (core business logic):**
- `symptoms/chat-question` — OpenAI-powered adaptive follow-up question generation during symptom logging
- `symptoms/log` — Save completed symptom log to Supabase
- `symptoms/socrates-questions` — SOCRATES framework question flow
- `symptoms/generate-report` / `symptoms/generate-summary` — AI-generated clinical summaries
- `symptoms/pdf` — PDF report generation endpoint
- `symptoms/summary/*` — Summary generation, labelling, follow-up
- `symptoms/overview` — Symptom overview/dashboard data
- `symptoms/canonicalize` — Symptom name canonicalisation
- `symptoms/search` — Symptom search
- `symptoms/process-transcript` — Process voice transcript into structured data

**Voice:** `voice/transcribe` — Voice-to-text transcription

### Key Libraries

- **`app/lib/pdf-generator.ts`** — `PDFGenerator` class using jsPDF + jspdf-autotable for clinical PDF reports
- **`app/lib/auth-context.tsx`** — React context for auth state (`useAuth` hook)
- **`app/lib/supabase.ts`** — Supabase client + onboarding helpers
- **`app/lib/ai-safety.ts`** / **`app/lib/security-compliance.ts`** — AI safety guardrails and security compliance
- **`app/lib/gdpr.ts`** / **`app/lib/data-retention.ts`** — GDPR compliance and data retention
- **`app/lib/rbac.ts`** — Role-based access control
- **`app/lib/audit-logger.ts`** — Audit logging

### Data Layer

- **Supabase** is the primary database (PostgreSQL) and auth provider. Schema defined in `backend/setup_supabase_tables.sql`.
- **MongoDB** is listed as a dependency but secondary; connection config in `app/lib/mongodb.ts`.
- The `symptom_logs` table stores structured SOCRATES data, impact assessments, and a `symptom_data` JSONB column for full context.

### Backend (Python — optional/legacy)

The `backend/` directory contains a Python Flask API (`symptoms_api.py`, `start_backend.py`) and Supabase client. This is secondary to the Next.js API routes which handle the same functionality. The `api/auth.py` at the project root is a standalone Python auth API.

### Styling

Tailwind CSS with CSS custom properties for theming (HSL color system defined in `app/globals.css`). Brand colors: blue (#2F80ED), teal (#19B5A3), green (#22C55E). Font: Inter. Framer Motion for animations.

### Deployment

Deployed on Vercel (`vercel.json` configured). The app is also configured as a PWA with `manifest.json` and service worker support via `next-pwa`.

## Middleware

`middleware.ts` enforces auth on all routes except public paths (`/`, `/auth`, `/verify-email`, and auth API endpoints). Unauthenticated requests are redirected to `/` with a `redirect` query param.

## Database Setup

Run `backend/setup_supabase_tables.sql` in the Supabase SQL editor to create all required tables. Additional migration: `backend/update_symptom_logs.sql`.
