# Personal Real-Time Chat App

A clean, responsive personal 1-to-1 real-time chat application built with a tactile **Sketch / Hand-Drawn** design system.

This codebase is developed for an online course evaluation, prioritizing clean architecture, strong separation of concerns, and industry-standard software engineering practices.

---

## Current Status: Phase 0 Completed

> **Phase 0: Project Foundation & Architecture** establishes the repository monorepo structure, backend and database architecture, shared data contracts, centralized Sketch design tokens, and runnable development environment. Application chat logic and screens are deferred to subsequent phases.

---

## Tech Stack

### Frontend (`client/`)
- **Framework:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom Sketch theme extension
- **Icons:** [Lucide React](https://lucide.dev/)
- **Typography:** Google Fonts — *Kalam* (700, Headings) & *Patrick Hand* (400, Body/UI)
- **Real-Time Client:** Socket.IO Client (scaffolded)

### Backend (`server/`)
- **Runtime:** [Node.js](https://nodejs.org/) (v24 LTS)
- **Framework:** [Express](https://expressjs.com/)
- **Language:** TypeScript (`tsx` for dev watch, `tsc` for production build)
- **Database:** Node 24 Native SQLite (`node:sqlite` `DatabaseSync` in WAL mode) — zero native compile issues, fully portable and self-contained
- **Real-Time Gateway:** [Socket.IO](https://socket.io/) (gateway initialized with typed event contracts)

### Shared (`shared/`)
- Typed data models (`User`, `Conversation`, `ConversationParticipant`, `Message`, `MessageStatus`)
- Real-time socket event contracts (`SOCKET_EVENTS`)
- API request/response contracts

---

## Architecture Overview

```
chat-app/
├── package.json               # Root workspace scripts & concurrency
├── .gitignore
├── .env.example               # Root environment reference
│
├── shared/                    # Shared TypeScript contracts & schemas
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts           # Shared interfaces (User, Conversation, Message, SocketEvents)
│
├── server/                    # Express + SQLite + Socket.IO Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env
│   ├── data/                  # SQLite persistent storage (chat.db)
│   └── src/
│       ├── index.ts           # Server entry point, HTTP & WebSocket setup
│       ├── config/
│       │   └── env.ts         # Type-safe environment validation
│       ├── db/
│       │   ├── database.ts    # SQLite manager (node:sqlite DatabaseSync)
│       │   └── schema.sql     # Relational schema (users, conversations, messages)
│       ├── models/            # Repository pattern abstraction layer
│       │   ├── user.repository.ts
│       │   ├── conversation.repository.ts
│       │   └── message.repository.ts
│       ├── routes/            # REST API endpoints
│       │   ├── health.routes.ts # GET /api/health
│       │   └── index.ts
│       ├── sockets/           # Real-time WebSocket gateway
│       │   ├── index.ts       # Socket.IO connection & event routing
│       │   └── socket.types.ts
│       └── middleware/        # Express middleware (logger, error handler)
│           ├── logger.middleware.ts
│           └── error.middleware.ts
│
└── client/                    # React + Vite Frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts         # Vite bundler config with /api and /socket.io proxy
    ├── tailwind.config.js     # Tailwind configuration with Sketch tokens
    ├── index.html             # HTML shell loading Kalam & Patrick Hand fonts
    ├── .env.example
    ├── .env
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main application root
        ├── index.css          # CSS root importing tokens & Tailwind
        ├── styles/
        │   ├── tokens.css     # CSS Custom Properties for Sketch theme
        │   └── sketch.css     # Wobbly border & offset shadow utility classes
        ├── theme/
        │   └── tokens.ts      # TypeScript design tokens export
        ├── components/
        │   └── ui/            # Foundational Sketch atoms (Box, Button, Input, Badge)
        │       ├── SketchBox.tsx
        │       ├── SketchButton.tsx
        │       ├── SketchInput.tsx
        │       └── SketchBadge.tsx
        ├── pages/
        │   └── FoundationShowcase.tsx # Phase 0 verification & token status view
        └── services/
            └── api.ts         # Typed Fetch API client
```

### Relational Data Model (Prepared for 1-to-1 and Group Extensibility)
- **`users`:** `id`, `username` (unique, case-insensitive), `created_at`, `last_seen_at`
- **`conversations`:** `id`, `type` (`'direct'` | `'group'`), `title`, `created_at`, `updated_at`
- **`conversation_participants`:** `conversation_id`, `user_id`, `joined_at`, `last_read_message_id`
- **`messages`:** `id`, `conversation_id`, `sender_id`, `content`, `created_at`
- **`message_status`:** `id`, `message_id`, `user_id`, `status` (`'sent'` | `'delivered'` | `'read'`), `updated_at`

---

## Sketch Design System Foundation

The visual design system adheres strictly to the Sketch / Hand-Drawn aesthetic:

| Token | Value | Purpose |
|---|---|---|
| **Background** | `#fdfbf7` | Soft paper tint |
| **Foreground / Text** | `#2d2d2d` | Pencil / dark graphite ink |
| **Muted** | `#e5e0d8` | Subtle cardboard accent |
| **Accent** | `#ff4d4d` | Playful hand-drawn red highlight |
| **Secondary Accent** | `#2d5da1` | Ink blue secondary |
| **Heading Font** | `Kalam` (700) | Distinct handwritten titles |
| **Body / UI Font** | `Patrick Hand` (400) | Clean handwritten body and labels |
| **Borders** | `2px solid #2d2d2d` | Defined ink borders |
| **Border Radius** | `255px 15px 225px 15px / 15px 225px 15px 255px` | Organic wobbly card & button contours |
| **Shadows** | `3px 3px 0px #2d2d2d` (hard offset) | Tactile 2D offset (no Gaussian blur) |

---

## Installation & Setup

### Prerequisites
- **Node.js:** v20+ (v24 LTS recommended)
- **npm:** v10+

### Installation
Run `npm install` from the repository root to install dependencies across all workspaces (`shared`, `server`, `client`):

```bash
npm install
```

Build the shared package before running the development server:

```bash
npm run build -w shared
```

---

## Available Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Runs both backend Express server and frontend Vite server concurrently |
| `npm run dev:server` | Runs the Express backend server with hot-reloading (`tsx watch`) on port 3001 |
| `npm run dev:client` | Runs the Vite frontend development server on port 5173 |
| `npm run build` | Compiles `shared`, `server`, and `client` for production |
| `npm run start` | Starts the production server from `server/dist/index.js` |
| `npm run typecheck` | Validates TypeScript types across both server and client |

---

## Environment Variables

### Root (`.env.example`)
```env
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DATABASE_PATH=./data/chat.db
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Server (`server/.env.example`)
```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_PATH=./data/chat.db
```

### Client (`client/.env.example`)
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

---

## Verification & Health Check

When the backend server runs, the health endpoint can be queried:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-10-01T21:17:29.257Z",
  "uptime": 20.48,
  "database": "connected"
}
```

The frontend proxy routes `/api/*` and `/socket.io/*` through Vite (`http://localhost:5173/api/health`), preventing CORS friction during development.

---

## Future Development Roadmap

- **Phase 1: User Identity & Onboarding** (First-time username setup, uniqueness check, returning user detection)
- **Phase 2: Real-Time Presence & User Discovery** (Online/offline presence, user search by username, online users list)
- **Phase 3: 1-to-1 Conversations & Messaging** (Message persistence, real-time message delivery via Socket.IO, recent chats)
- **Phase 4: Message Statuses & Interaction Details** (Sent / delivered / read states, typing indicators, unread counters)
- **Phase 5: Reliability & Polish** (Auto-reconnection, failed-message retry, smart auto-scroll, responsive mobile polish)
- **Future Possibility:** Group conversations (supported by schema without architecture refactoring)
