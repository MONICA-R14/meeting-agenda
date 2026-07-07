# AI Meeting Assistant

A full-stack web application that uses AI to generate meeting agendas, track attendance, manage teams, and score meeting quality.

## Features

- **AI Agenda Generation** — generates structured meeting agendas using Groq LLaMA 3.3 70B
- **Post-Meeting Summary** — converts rough notes into structured summaries with action items and key decisions
- **Meeting Scheduler** — schedule meetings with date, time, attendees, and auto-generated Jitsi links
- **Email Invites** — sends HTML email invitations to all attendees via Gmail SMTP
- **Attendance Tracking** — UUID token-based system; attendees mark attendance by clicking a link in their email
- **Automated Reminders** — cron job sends reminders 1 day, 1 hour, and 15 minutes before each meeting
- **Team Management** — create teams and reuse member lists when scheduling
- **Action Item Tracker** — tracks tasks extracted from meeting summaries with completion toggle
- **Meeting Quality Score** — 0–10 score across 5 categories with AI-generated improvement tip
- **Admin Dashboard** — aggregate statistics across users, teams, meetings, and attendance

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| AI | Groq SDK (LLaMA 3.3 70B) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Email | Nodemailer, Gmail SMTP |
| Scheduler | node-cron |
| Frontend | HTML, CSS, Vanilla JavaScript |

## Project Structure

```
server/
├── index.js                  # App entry point
├── middleware/
│   └── authMiddleware.js     # JWT authentication guard
├── models/
│   ├── User.js
│   ├── Meeting.js
│   ├── Team.js
│   ├── Schedule.js
│   └── Score.js
├── routes/
│   ├── auth.js               # Register / Login
│   ├── agenda.js             # AI agenda + summary
│   ├── team.js               # Team CRUD
│   ├── schedule.js           # Meeting scheduler
│   ├── attendance.js         # Attendance tracking
│   ├── actionitem.js         # Action item tracker
│   ├── score.js              # Meeting quality score
│   └── admin.js              # Admin dashboard
├── utils/
│   ├── mailer.js             # Email service
│   └── reminderCron.js       # Background reminder job
└── client/                   # Frontend HTML/CSS/JS files
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Groq API key
- Gmail account with App Password enabled

### Installation

```bash
git clone https://github.com/MONICA-R14/meeting-agenda.git
cd meeting-agenda/server
npm install
```

### Environment Variables

Create a `server/.env` file with the following:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
GMAIL_USER=your_gmail_address
GMAIL_PASS=your_gmail_app_password
APP_URL=http://localhost:5000
PORT=5000
```

> **Note:** Never commit `.env` to git. It is listed in `.gitignore`.

### Run

```bash
cd server
npm run dev
```

The app runs on `http://localhost:5000`.

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login and get JWT |

### Agenda
| Method | Route | Description |
|---|---|---|
| POST | /api/agenda/generate | Generate AI meeting agenda |
| POST | /api/agenda/summary | Generate post-meeting summary |
| GET | /api/agenda/history | Get all past agendas |
| DELETE | /api/agenda/:id | Delete an agenda |

### Teams
| Method | Route | Description |
|---|---|---|
| POST | /api/team | Create team |
| GET | /api/team | List teams |
| PUT | /api/team/:id | Update team |
| DELETE | /api/team/:id | Delete team |
| POST | /api/team/:id/members | Add member |
| PUT | /api/team/:id/members/:memberId | Update member |
| DELETE | /api/team/:id/members/:memberId | Remove member |

### Schedule
| Method | Route | Description |
|---|---|---|
| POST | /api/schedule | Create meeting + send invites |
| GET | /api/schedule | List all meetings |
| GET | /api/schedule/:id | Get single meeting |
| PUT | /api/schedule/:id/status | Update status |
| PUT | /api/schedule/:id/reschedule | Reschedule meeting |
| DELETE | /api/schedule/:id | Delete meeting |

### Attendance
| Method | Route | Description |
|---|---|---|
| POST | /api/attendance/init/:scheduleId | Initialize attendance tokens |
| GET | /api/attendance/join/:token | Mark attendance via email link (public) |
| GET | /api/attendance/:scheduleId | Get attendance report |
| PUT | /api/attendance/:scheduleId/finalize | Finalize attendance |
| PUT | /api/attendance/:scheduleId/manual | Manual override |

### Score
| Method | Route | Description |
|---|---|---|
| POST | /api/score/calculate | Calculate meeting score |
| GET | /api/score/history | Score history |
| GET | /api/score/stats | Score statistics and trend |

### Admin
| Method | Route | Description |
|---|---|---|
| GET | /api/admin/stats | Overall statistics |
| GET | /api/admin/users | All users |
| GET | /api/admin/teams | All teams |
| GET | /api/admin/meetings/recent | Recent meetings |
| GET | /api/admin/attendance/report | Overall attendance report |

## Meeting Score Breakdown

| Category | Max Points | Criteria |
|---|---|---|
| Attendance | 3 | 100% = 3, 80%+ = 2, 60%+ = 1 |
| Time Management | 2 | Within 5 min = 2, within 15 min = 1 |
| Action Items | 2 | 3+ items = 2, 1+ items = 1 |
| Summary | 2 | 50+ words = 2, any summary = 1 |
| Punctuality | 1 | Started on time = 1 |

Grades: A+ (9–10), A (8), B+ (7), B (6), C (5), D (below 5)

## License

MIT
