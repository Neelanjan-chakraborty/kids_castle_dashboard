# Kids Castle — Playschool Management System

A full-stack school management application for small play schools (Nursery to Class 2).

## Features

- **Student Management** — Register students (Nursery–Class 2 with divisions), with **Gemini AI** image-to-form auto-fill
- **Daily Attendance** — Cron-based initialization at 6 AM, mark present/absent/late per class/division
- **Fees Management** — Fee structures per class, auto-generated monthly fee records, payment collection, overdue tracking
- **Exam Management** — Create exams, enter marks per subject, auto-calculate grades and report cards
- **Question Paper Archive** — Upload and browse papers by year, class, and subject
- **Report Cards** — Auto-generated with ranks, printable

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | PocketBase (Go, SQLite, JS Hooks)   |
| Frontend  | React 18 + Vite + TypeScript        |
| Styling   | Tailwind CSS                        |
| State     | Zustand + React Query               |
| AI        | Google Gemini 1.5 Flash             |
| Deploy    | Render (backend) + Vercel (frontend)|

## Getting Started

### 1. Backend (PocketBase)

```bash
cd backend
docker-compose up -d
```

PocketBase admin: http://localhost:8090/_/

**First-time setup:**
1. Go to PocketBase admin and create your admin account
2. The migration (`001_initial_schema.js`) will auto-run and create all collections
3. Go to Settings → Seed data:
   - Create an Academic Year (e.g., "2024-25", mark as current)
   - Add classes (Nursery, LKG, UKG, Class 1, Class 2)
   - Add divisions (A, B, C, D) for each class
   - Set up fee structures per class

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
npm install
npm run dev
```

Open http://localhost:5173

### Environment Variables

```env
VITE_PB_URL=http://localhost:8090          # PocketBase URL
VITE_GEMINI_API_KEY=your_key_here          # Get from Google AI Studio
VITE_SCHOOL_NAME=Kids Castle               # School name
```

## Deployment

### Backend on Render

1. Push code to GitHub
2. Create a new Web Service on Render, connect repo
3. Point to `render.yaml` (auto-detected) OR manually:
   - Runtime: Docker
   - Dockerfile path: `./backend/Dockerfile`
   - Docker context: `./backend`
   - Add a **Persistent Disk** at `/pb/pb_data` (5 GB)
4. Set env var `PB_ENCRYPTION_KEY` (use Render's "Generate" button)
5. After deploy, visit `https://your-service.onrender.com/_/` to create admin

### Frontend on Vercel

```bash
cd frontend
npm run build   # test build locally first
```

1. Import GitHub repo on Vercel
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set environment variables:
   - `VITE_PB_URL` = your Render backend URL
   - `VITE_GEMINI_API_KEY` = your Gemini API key

### Frontend on Netlify

Netlify config is in `frontend/netlify.toml` — just connect the repo and set environment variables.

## PocketBase Cron Jobs

Cron jobs run server-side via `pb_hooks/`:

| Schedule       | Job                                            |
|----------------|------------------------------------------------|
| `0 6 * * *`    | Create attendance records for all active students (default: absent) |
| `59 23 * * *`  | Lock daily attendance sessions, compute totals |
| `0 8 1 * *`    | Mark pending fees as overdue if past due date  |

## Initial Data Setup (After Deploy)

1. **Academic Year**: Settings → Academic Year → Create `2024-25`
2. **Classes**: Settings → Classes → Add Nursery, LKG, UKG, Class 1, Class 2
3. **Divisions**: Settings → Classes → Add Division A, B for each class
4. **Subjects**: Settings → Subjects → Use "Auto-Seed for Class" button
5. **Fee Structures**: Settings → Fee Structures → Add tuition, activity fees per class

## Roles & Permissions

| Permission                   | Super Admin | Principal | Teacher         | Staff         |
|------------------------------|-------------|-----------|-----------------|---------------|
| Manage Branches              | ✓           | ✗         | ✗               | ✗             |
| Global App Settings          | ✓           | ✗         | ✗               | ✗             |
| Manage All Users             | ✓           | ✗         | ✗               | ✗             |
| Manage Teachers & Staff      | ✓           | ✓         | ✗               | ✗             |
| Assign Classes to Teachers   | ✓           | ✓         | ✗               | ✗             |
| Configure Staff Permissions  | ✓           | ✓         | ✗               | ✗             |
| Mark Teacher Attendance      | ✓           | ✓         | ✗               | Custom        |
| View Students                | ✓           | ✓         | Own classes     | Custom        |
| Manage Students              | ✓           | ✓         | Own classes     | Custom        |
| Mark Student Attendance      | ✓           | ✓         | Own classes     | Custom        |
| Collect Fees                 | ✓           | ✓         | Own classes     | Custom        |
| Manage Exams / Enter Marks   | ✓           | ✓         | Own classes     | Custom        |
| Report Cards                 | ✓           | ✓         | View only       | Custom        |
| Academic Settings            | ✓           | ✓         | ✗               | ✗             |

**Teacher Scoping:** Teachers automatically see only students and attendance from their assigned classes/divisions (set by Principal in "Assign Classes").

**Staff:** By default has zero permissions. Principal grants permissions individually per staff member via "Staff Permissions" page.

## Grade Scale

| Grade | Percentage |
|-------|-----------|
| A+    | 90–100%   |
| A     | 80–89%    |
| B+    | 70–79%    |
| B     | 60–69%    |
| C     | 50–59%    |
| D     | 40–49%    |
| F     | Below 40% |

## Project Structure

```
kids-castle/
├── backend/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── pb_hooks/
│   │   ├── cron_attendance.pb.js   # Daily cron jobs
│   │   ├── student_hooks.pb.js     # Auto admission no, fee generation
│   │   └── exam_hooks.pb.js        # Grade calculation, report cards
│   └── pb_migrations/
│       └── 001_initial_schema.js   # All collections schema
├── frontend/
│   ├── src/
│   │   ├── api/          # PocketBase API wrappers
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # pb.ts, gemini.ts, utils.ts
│   │   ├── pages/        # Route-level pages
│   │   ├── stores/       # Zustand state
│   │   └── types/        # TypeScript interfaces
│   ├── vercel.json
│   └── netlify.toml
├── render.yaml
└── .gitignore
```
