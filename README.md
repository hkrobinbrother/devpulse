# DevPulse API 🚀

A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

## Live URL
https://devpulse-api.vercel.app

## Features
- JWT-based authentication
- Role-based access control (contributor / maintainer)
- Full CRUD for issues (bug reports & feature requests)
- Filtering & sorting support
- PostgreSQL with raw SQL (no ORM)

## Tech Stack
- Node.js (LTS), TypeScript, Express.js
- PostgreSQL (NeonDB) with native `pg` driver
- bcrypt, jsonwebtoken, http-status-codes

## Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/devpulse.git
cd devpulse
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and add your NeonDB connection string and a JWT secret.

### 4. Run in development
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm start
```

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/signup | Public | Register new user |
| POST | /api/auth/login | Public | Login & get JWT |
| GET | /api/issues | Public | Get all issues |
| GET | /api/issues/:id | Public | Get single issue |
| POST | /api/issues | Authenticated | Create issue |
| PATCH | /api/issues/:id | Authenticated | Update issue |
| DELETE | /api/issues/:id | Maintainer | Delete issue |

### Query Parameters for GET /api/issues
- `sort` — `newest` (default) or `oldest`
- `type` — `bug` or `feature_request`
- `status` — `open`, `in_progress`, or `resolved`

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Unique, required |
| password | VARCHAR(255) | Hashed, never returned |
| role | VARCHAR(20) | contributor / maintainer |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### issues
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| title | VARCHAR(150) | Required, max 150 chars |
| description | TEXT | Required, min 20 chars |
| type | VARCHAR(20) | bug / feature_request |
| status | VARCHAR(20) | open / in_progress / resolved |
| reporter_id | INTEGER | References users.id |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |
