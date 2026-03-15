# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids Castle is a full-stack school management system for small Indian play schools (Nursery–Class 2). It uses PocketBase as the backend (SQLite + JavaScript hooks) and React 18 + TypeScript + Vite for the frontend.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript check + Vite build to dist/
npm run lint      # ESLint strict mode (max-warnings 0)
npm run preview   # Preview production build
```

### Backend (from `backend/`)
```bash
docker-compose up -d   # Start PocketBase at http://localhost:8090
docker-compose down    # Stop backend
```

There are no backend tests. The frontend has no test framework configured.

### Initial Setup
1. Start backend → visit `http://localhost:8090/_/` to create superadmin account
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_PB_URL`, `VITE_GEMINI_API_KEY`, `VITE_SCHOOL_NAME`
3. Run `npm install && npm run dev` in `frontend/`

## Architecture

### Backend: PocketBase
- **Runtime:** Single Go binary (v0.23.4), SQLite database, runs in Docker
- **Migrations:** `backend/pb_migrations/` — defines all collections (run automatically on start)
- **Hooks:** `backend/pb_hooks/` — server-side JavaScript triggered on record events and cron schedules
- **Admin UI:** `http://localhost:8090/_/`
- **REST API:** Auto-generated at `http://localhost:8090/api/collections/{name}/*`

### Frontend: React + Vite
- **Entry:** `frontend/src/main.tsx` → `App.tsx` (routes) → pages in `src/pages/`
- **PocketBase client:** `src/lib/pb.ts` — initialized with `VITE_PB_URL`, auto-cancel disabled
- **API layer:** `src/api/*.ts` — thin typed wrappers around PocketBase collection calls
- **State:** Zustand (`src/stores/authStore.ts`) for auth + staff permissions; React Query for server state
- **Path alias:** `@/*` maps to `src/*`
- **Dev proxy:** Vite proxies `/api` to PocketBase to avoid CORS

### RBAC System
Four roles: `super_admin`, `principal`, `teacher`, `staff`
- Role permissions are statically defined in `src/lib/permissions.ts` (21 permission strings)
- Staff get custom per-record permissions stored in the `staff_permissions` PocketBase collection
- `src/hooks/usePermissions.ts` — hook to check permissions in components
- Auth guards: `ProtectedRoute`, `RoleGuard`, `PermissionGate` in `src/components/layout/`
- Teachers are scoped to their assigned class/division via `src/hooks/useTeacherScope.ts`

### Hook Logic (Server-Side Automation)
- **`student_hooks.pb.js`:** Auto-generates admission numbers (`KC-YYYY-NNNN`), roll numbers, and fee records on student creation
- **`cron_attendance.pb.js`:** 6 AM — creates daily attendance records (default absent); 11:59 PM — locks sessions; 1st of month 8 AM — marks overdue fees
- **`exam_hooks.pb.js`:** Auto-calculates grade (A+/A/B+/B/C/D/F) and upserts report cards when marks are saved
- **`rbac_hooks.pb.js`:** Creates teacher attendance records at 6 AM; enforces teacher can only update attendance for their assigned class

### Key Collections
- `students` — core student records with `class_id`, `division_id` (expanded in queries)
- `attendance` / `attendance_sessions` — daily per-student records + locked class summaries
- `exams` / `exam_marks` / `report_cards` — exam pipeline with auto-calculated grades
- `fee_structures` / `fee_records` — per-class fee config + per-student instances
- `teacher_assignments` — maps users to class/division/subject (used for teacher scoping)
- `staff_permissions` — stores custom permission arrays for staff role users
- `school_branches` — multi-branch support

### AI Integration
`src/lib/gemini.ts` — Calls Gemini 1.5 Flash API to extract student data from uploaded admission form photos. Used in the student registration flow via `AiScanModal`. Requires `VITE_GEMINI_API_KEY`.

## Deployment
- **Backend:** Render (Docker, persistent disk at `/pb/pb_data`) — config in `render.yaml`; set `PB_ENCRYPTION_KEY` in Render env vars
- **Frontend:** Vercel or Netlify from `frontend/` directory; set all `VITE_*` env vars in the hosting dashboard
