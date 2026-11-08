# 📋 Task Management System

A production-ready, full-stack task management application with a **Node.js & Express REST API**, **PostgreSQL** database persistence, a **modern, responsive frontend**, and automated **CI/CD deployment via GitHub Actions**.

---

## 🗂️ Project Structure

```text
task-management/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: automated test, image build & SSH deployment
├── frontend/
│   ├── css/
│   │   └── styles.css          # Modern dark/glassmorphic styling
│   ├── js/
│   │   ├── api.js              # Dynamic API client with offline/demo fallback
│   │   └── app.js              # UI controller, filtering & dialog logic
│   ├── Dockerfile              # Lightweight Nginx container for web UI
│   ├── nginx.conf              # Nginx reverse proxy configuration for /api
│   ├── .dockerignore
│   └── index.html              # Responsive dashboard with native <dialog>
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # PostgreSQL connection pool & auto-init
│   │   ├── controllers/
│   │   │   └── taskController.js # CRUD handlers with input validation
│   │   ├── routes/
│   │   │   ├── taskRoutes.js   # /api/tasks endpoints
│   │   │   └── healthRoutes.js # /api/health endpoint
│   │   └── server.js           # Express app, CORS, error handling
│   ├── Dockerfile              # Node.js 20 Alpine production image
│   ├── .dockerignore
│   ├── package.json
│   └── .env.example
├── database/
│   └── init.sql                # Table schema, indexes, trigger & seed data
├── docker-compose.yml          # Multi-container orchestration (db, backend, frontend)
├── package.json                # Root convenience runner scripts
└── README.md
```

---

## 🚀 Architecture & Networking

```text
  Browser (Client)
    │
    │  HTTP :3000 (UI & /api proxy)  OR  HTTP :5000 (/api direct)
    ▼
┌───────────────────────── task-network (Docker) ─────────────────────────┐
│                                                                         │
│   ┌────────────────────┐                   ┌────────────────────────┐  │
│   │  task-frontend     │  proxy /api/ ->   │  task-backend          │  │
│   │  (Nginx :80)       ├──────────────────►│  (Node.js Express :5000│  │
│   │  Exposed on :3000  │                   │  Exposed on :5000      │  │
│   └────────────────────┘                   └───────────┬────────────┘  │
│                                                        │                │
│                                            PostgreSQL  │ :5432          │
│                                                        ▼                │
│                                            ┌────────────────────────┐  │
│                                            │  task-db               │  │
│                                            │  (Postgres 16 :5432)   │  │
│                                            │  Exposed on :5433      │  │
│                                            └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dynamic Backend Detection & Nginx Reverse Proxy
- **Zero-config Dynamic Resolution**: In `frontend/js/api.js`, the API base URL is resolved dynamically via `window.location.hostname`. Whether you visit `http://localhost:3000`, `http://102.37.146.13:3000`, or a custom domain, the frontend automatically routes API requests to the matching backend.
- **Nginx Reverse Proxy**: `frontend/nginx.conf` proxies `/api/` directly to `http://backend:5000/api/` inside Docker's internal network. This guarantees that API calls succeed on port 3000 even if port 5000 is blocked by cloud firewall rules (e.g. AWS Security Groups, UFW).
- **Graceful Fallback**: If the backend is disconnected, the frontend automatically enters **Demo Mode** with interactive local storage.

---

## 🐳 Running with Docker Compose (Recommended)

Run the entire application stack (**PostgreSQL**, **Node.js REST API**, and **Frontend**) with a single command:

### 1. Launch All Services
```bash
docker compose up -d --build
```

### 2. Verify Running Containers
```bash
docker compose ps
```

### 3. View Logs
```bash
# View all service logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View frontend / Nginx access logs
docker compose logs -f frontend
```

### 4. Access the Applications
| Service | URL / Port | Details |
| :--- | :--- | :--- |
| **Frontend Web UI** | [http://localhost:3000](http://localhost:3000) | Nginx serving the TaskFlow dashboard with `/api` reverse proxy |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) | Express REST API |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Service & DB status |
| **PostgreSQL Database** | `localhost:5433` (Internal: `5432`) | User: `postgres`, DB: `taskdb` |

> [!NOTE]
> The database host port is mapped to `5433:5432` by default to avoid conflicts if your host machine already runs a local PostgreSQL service on `5432`. Inside the Docker network, the backend connects seamlessly to `db:5432`.

### 5. Stop All Services
```bash
# Stop containers
docker compose down

# Stop containers and wipe database volume (fresh start)
docker compose down -v
```

---

## 🤖 CI/CD Pipeline (GitHub Actions)

The repository includes an automated CI/CD pipeline defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Workflow Stages:
1. **`test-backend`**:
   - Sets up Node.js 18.
   - Installs backend dependencies (`npm ci`).
   - Runs unit tests (`npm test`).
2. **`build-frontend`**:
   - Uses Docker Buildx.
   - Builds the production frontend Nginx container image with `context: ./frontend`.
3. **`deploy`**:
   - Connects to your remote deployment server over SSH via `appleboy/ssh-action`.
   - Navigates to `/var/www/taskapp`.
   - Pulls the latest changes from `main`.
   - Runs `docker compose down && docker compose up -d --build`.
   - Verifies container health with `docker compose ps`.

### Required GitHub Repository Secrets:
To configure the deployment step, set these secrets in your GitHub repository (**Settings** > **Secrets and variables** > **Actions**):
- `TASK_MACHINE_HOST`: Server IP address or hostname (e.g. `102.37.146.13`).
- `TASK_MACHINE_USER`: SSH username (e.g. `ubuntu` or `root`).
- `TASK_MACHINE_SSH_KEY`: Private SSH key authorized on the server.

---

## 📦 Running Individual Docker Containers

If you prefer building and running each container manually:

### 1. Build the Images
```bash
# Backend
docker build -t task-backend ./backend

# Frontend
docker build -t task-frontend ./frontend
```

### 2. Run the Containers
```bash
# Create shared internal bridge network
docker network create task-network

# Start PostgreSQL Database
docker run -d \
  --name task-db \
  --network task-network \
  -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=taskdb \
  -v postgres_data:/var/lib/postgresql/data \
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \
  postgres:16-alpine

# Start Backend API
docker run -d \
  --name task-backend \
  --network task-network \
  -p 5000:5000 \
  -e DB_HOST=task-db \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=taskdb \
  task-backend

# Start Frontend
docker run -d \
  --name task-frontend \
  --network task-network \
  -p 3000:80 \
  task-frontend
```

---

## 💻 Running Locally (Without Docker)

### 1. Database Setup
Ensure PostgreSQL is running locally:
- Create database `taskdb`.
- Run initialization script:
  ```bash
  psql -U postgres -d taskdb -f database/init.sql
  ```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL password if needed
npm install
npm run dev
```
The API will start on **`http://localhost:5000`**.

### 3. Frontend Setup
From the project root:
```bash
npm run dev:frontend
# or: npx serve frontend
```
Or open [frontend/index.html](file:///home/onuigbo-precious/task-management/frontend/index.html) directly in any web browser.

---

## 📡 REST API Documentation

### Base URL: `/api` (or `http://localhost:5000/api`)

| Method | Endpoint | Description | Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service & DB Health Check | None |
| `GET` | `/tasks` | Retrieve all tasks | Query: `?status=todo&priority=high&search=keyword` |
| `GET` | `/tasks/:id` | Retrieve single task by ID | Path: `id` |
| `POST` | `/tasks` | Create a new task | Body: `{ "title": "Required", "description": "", "status": "todo", "priority": "medium", "due_date": "YYYY-MM-DD" }` |
| `PUT` | `/tasks/:id` | Update entire task | Body: `{ "title": "...", "description": "...", "status": "...", "priority": "...", "due_date": "..." }` |
| `PATCH` | `/tasks/:id/status`| Quick status update | Body: `{ "status": "completed" }` |
| `DELETE`| `/tasks/:id` | Delete task by ID | Path: `id` |

#### Valid Values:
- **Status:** `'todo'`, `'in_progress'`, `'completed'`
- **Priority:** `'low'`, `'medium'`, `'high'`

---

## 🎨 Frontend Features

- ⚡ **Auto-detect Backend:** Displays real-time connection status (`Connected: PostgreSQL` vs `Demo Mode`).
- 📊 **Live Stats Dashboard:** Displays counts for Total, To Do, In Progress, and Completed tasks.
- 🔍 **Live Filtering & Search:** Search by keywords across title & description; filter by status or priority.
- 📝 **Modals:** Accessible native `<dialog>` modals for creating and editing tasks with backdrop blur and light-dismiss.
- ⌨️ **Keyboard Shortcut:** Press `N` anywhere to quickly create a new task.
- 🍞 **Toast Notifications:** Real-time feedback for actions (save, update, delete).

---

## 🛠️ Common Troubleshooting

### 1. UI Shows "Demo Mode (Backend Offline)"
- **Check Backend Container Status:** Run `docker compose ps` to ensure `task-backend` and `task-db` are running and healthy.
- **Inspect Backend Logs:** Run `docker compose logs backend` to confirm the backend is successfully connected to PostgreSQL.
- **Firewall:** If accessing remotely, make sure port 3000 (and optionally port 5000) is open in your cloud firewall / security group. With the Nginx reverse proxy now in place, frontend requests to `/api` work through port 3000 automatically.

### 2. `permission denied while trying to connect to the docker API`
Fix by adding your Linux user to the `docker` group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 3. `listen tcp 0.0.0.0:5000: bind: address already in use`
A local Node.js process is occupying port 5000. Stop it with:
```bash
npx kill-port 5000
# or find the PID:
lsof -i :5000
```

### 4. `listen tcp 0.0.0.0:5432: bind: address already in use`
Your host machine has a native PostgreSQL service running on port 5432.
- The included `docker-compose.yml` maps PostgreSQL to host port **`5433`** to avoid this issue automatically.
- Alternatively, stop the local service: `sudo systemctl stop postgresql`.

### 5. `404 Not Found` when running `npx serve`
- If you are in the project root: run `npx serve frontend`
- If you are already inside the `frontend/` folder: run `npx serve .`
