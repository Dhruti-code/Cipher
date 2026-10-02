# Render Deployment Guide: Personal Real-Time Chat App

This guide provides complete, production-verified instructions for deploying the Personal Real-Time Chat App to **Render** (https://render.com).

---

## 1. Architecture

The application is deployed as **two interconnected services** on Render:

```
[ Browser / Client ]
        │
        ├─── HTTPS (Static Assets) ────────► [ Frontend: Render Static Site ]
        │                                         (React 18 + Vite, dist/)
        │
        ├─── HTTPS (REST API /api/*) ──────► [ Backend: Render Web Service ]
        └─── WSS (Socket.IO /socket.io) ───►      (Node.js + Express + SQLite)
```

- **Frontend:** Hosted as a **Render Static Site** (Fast, global CDN, handles SPA client routing).
- **Backend:** Hosted as a **Render Web Service** (Persistent Node.js environment supporting HTTP and persistent WebSockets).
- **Database:** Local **SQLite** (`./data/chat.db`), with optional **Render Persistent Disk** for permanent data across restarts.

---

## 2. Required Render Services

| Service | Type | Environment | Root Directory |
|---|---|---|---|
| **Chat API & Gateway** | **Web Service** | Node | `.` (Repository root) |
| **Chat Web UI** | **Static Site** | Static | `.` (Repository root) |

---

## 3. Build & Start Commands

### Backend (Web Service)
- **Build Command:**
  ```bash
  npm run build:server
  ```
  *(Compiles `shared` contracts and compiles `server` TypeScript to `dist/`, including automated schema initialization copy).*
- **Start Command:**
  ```bash
  npm run start
  ```
  *(Executes `node server/dist/index.js`, binding to `process.env.PORT`).*

### Frontend (Static Site)
- **Build Command:**
  ```bash
  npm run build:client
  ```
  *(Compiles `shared` contracts and builds optimized Vite bundle into `client/dist`).*
- **Publish Directory:**
  ```
  client/dist
  ```

---

## 4. Environment Variables Reference

### Backend Web Service Environment Variables

| Variable | Required | Production Value | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations and security headers. |
| `NODE_VERSION` | Yes | `22.13.0` (or `22`) | Ensures Node >= 22.5 is used for built-in `node:sqlite` support. |
| `PORT` | Auto | *(Injected by Render automatically)* | Port Express/Socket.IO listens on. Defaults to 3001 locally. |
| `CLIENT_URL` | Yes | `https://<your-frontend-site>.onrender.com` | Allowed origin for CORS and Socket.IO. Supports multiple comma-separated URLs. |
| `DATABASE_PATH` | Optional | `./data/chat.db` *(or `/var/data/chat.db` if using Persistent Disk)* | Absolute or relative path to SQLite database file. |

### Frontend Static Site Environment Variables

| Variable | Required | Production Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Yes | `https://<your-backend-service>.onrender.com/api` | Base URL for REST API calls. |
| `VITE_SOCKET_URL` | Yes | `https://<your-backend-service>.onrender.com` | Root URL for Socket.IO WebSocket connections. |

> **IMPORTANT:** Vite bundles `VITE_*` variables at build time. When changing these variables, trigger a **Manual Deploy > Clear build cache & deploy** on the Static Site.

---

## 5. SQLite Persistence & Render Disk Warning

> [!WARNING]
> **Ephemeral Filesystem Notice:**
> Standard Render Web Service containers use an **ephemeral disk**. Files written to `./data/chat.db` persist while the service runs, but will be **reset upon redeployments or container restarts**.

### Retaining Data Across Deployments (Recommended):
1. In your Render Dashboard for the Backend Web Service, navigate to **Disks**.
2. Click **Add Disk**:
   - **Name:** `chat-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB` (sufficient for millions of chat messages).
3. In the Web Service **Environment** tab, set:
   ```env
   DATABASE_PATH=/var/data/chat.db
   ```
4. Save changes. SQLite will now store all user and chat history permanently on the mounted disk.

---

## 6. Step-by-Step Deployment Instructions

### Step 1: Push Code to Git
Ensure your latest changes are pushed to GitHub or GitLab:
```bash
git add .
git commit -m "chore: prepare production configuration for Render deployment"
git push origin main
```

### Step 2: Deploy Backend Web Service
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your repository.
4. Fill in the service settings:
   - **Name:** `personal-chat-server` (or your chosen name)
   - **Region:** Choose the region closest to you (e.g., Oregon, Frankfurt, Singapore).
   - **Branch:** `main`
   - **Root Directory:** `.` (leave blank / root)
   - **Runtime:** `Node`
   - **Build Command:** `npm run build:server`
   - **Start Command:** `npm run start`
   - **Plan:** Free or Starter
5. Under **Advanced** > **Health Check Path**, enter:
   ```
   /api/health
   ```
6. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `http://localhost:5173` *(temporary placeholder until Frontend is created)*
7. Click **Create Web Service**.
8. Wait for deployment to complete. Copy your backend URL (e.g. `https://personal-chat-server.onrender.com`).

### Step 3: Deploy Frontend Static Site
1. In Render Dashboard, click **New +** > **Static Site**.
2. Connect the same repository.
3. Fill in the static site settings:
   - **Name:** `personal-chat-app` (or your chosen name)
   - **Branch:** `main`
   - **Root Directory:** `.` (leave blank / root)
   - **Build Command:** `npm run build:client`
   - **Publish Directory:** `client/dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-backend-service>.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://<your-backend-service>.onrender.com`
5. Click **Create Static Site**.
6. Wait for deployment to finish. Copy your frontend URL (e.g. `https://personal-chat-app.onrender.com`).

### Step 4: Update Backend with Final Frontend URL
1. Go back to your **Backend Web Service** in Render.
2. Navigate to **Environment**.
3. Update `CLIENT_URL` with your actual frontend URL:
   ```env
   CLIENT_URL=https://personal-chat-app.onrender.com
   ```
4. Click **Save Changes**. Render will automatically redeploy the backend with the new CORS origin.

---

## 7. SPA Rewrite Configuration (404 Prevention)

Single Page Applications require routing all deep paths back to `index.html`.
The project already includes `client/public/_redirects`:
```
/*    /index.html   200
```
When Vite runs `npm run build:client`, this file is automatically placed into `client/dist/_redirects`. Render Static Sites automatically recognizes this rule so that refreshing any route will never yield a 404 error.

---

## 8. Verifying Production Deployment

Once both services show **Live**:

1. **Verify Backend Health:**
   Open in browser:
   `https://<your-backend-service>.onrender.com/api/health`
   Should return:
   ```json
   {
     "success": true,
     "status": "healthy",
     "timestamp": "...",
     "uptime": 12.3,
     "database": "connected"
   }
   ```

2. **Verify Frontend & Chat Flow:**
   - Open your frontend URL: `https://<your-frontend-site>.onrender.com`
   - Register User A (e.g., `alice`).
   - Open an incognito window and register User B (e.g., `bob`).
   - Search for `bob` from `alice`, and initiate chat.
   - Send messages in real time. Verify typing indicator, `SENT` → `DELIVERED` → `READ` tick marks, unread badges, and presence indicators.

---

## 9. Troubleshooting

### Issue 1: CORS Errors in Browser Console
- **Symptom:** `Access to fetch at ... has been blocked by CORS policy`.
- **Cause:** `CLIENT_URL` on the backend does not match the frontend origin, or contains a typo/trailing slash.
- **Fix:** In backend Render dashboard, check `CLIENT_URL`. Ensure it exactly matches `https://<your-frontend>.onrender.com` without trailing slash.

### Issue 2: Socket.IO Fails to Connect
- **Symptom:** `[SocketService] Connection error: websocket error` or infinite connecting state.
- **Cause:** `VITE_SOCKET_URL` is missing or pointing to the frontend static site instead of the backend web service.
- **Fix:** In frontend Render dashboard, ensure `VITE_SOCKET_URL` is set to `https://<your-backend>.onrender.com`. Trigger **Clear build cache & deploy**.

### Issue 3: Page Refresh Returns 404 Not Found
- **Symptom:** Reloading the browser shows Render's 404 page.
- **Cause:** `_redirects` file missing from build output.
- **Fix:** Verify `client/public/_redirects` exists. It contains `/* /index.html 200`.

### Issue 4: Chat History Disappears After Server Sleep / Redeploy
- **Symptom:** Registered users and conversations are lost when the server restarts.
- **Cause:** Free-tier Render containers spin down after inactivity and wipe ephemeral disk storage.
- **Fix:** Add a **Render Persistent Disk** mounted at `/var/data` and configure `DATABASE_PATH=/var/data/chat.db`.
