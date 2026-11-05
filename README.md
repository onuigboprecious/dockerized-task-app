# 📋 Task Management System

A full-stack task management application with a **Node.js & Express REST API**, **PostgreSQL** database persistence, and a **modern, responsive frontend**.

---

## 🗂️ Project Structure

```text
task-management/
├── frontend/
│   ├── css/
│   │   └── styles.css          # Modern dark/glassmorphic styling
│   ├── js/
│   │   ├── api.js              # API client with offline/demo fallback
│   │   └── app.js              # UI controller, filtering & dialog logic
│   ├── Dockerfile              # Lightweight Nginx container for web UI
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
├── .env.example                # Root environment template
├── package.json                # Root convenience runner scripts
└── README.md
```

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
```

### 4. Access the Applications
| Service | URL / Port | Details |
| :--- | :--- | :--- |
| **Frontend Web UI** | [http://localhost:3000](http://localhost:3000) | Nginx serving the TaskFlow dashboard |
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

## 📦 Running Individual Docker Containers

If you prefer building and running each container manually:

### 1. Build the Images
```bash
# Backend (from task-management/backend/)
cd backend
docker build -t task-backend .

# Frontend (from task-management/frontend/)
cd ../frontend
docker build -t task-frontend .
```

### 2. Run the Containers
```bash
# Start PostgreSQL Database
docker run -d \
  --name task-db \
  -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=taskdb \
  -v postgres_data:/var/lib/postgresql/data \
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \
  postgres:16-alpine

# Start Backend API
docker run -d \
  --name task-backend-app \
  -p 5000:5000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5433 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=taskdb \
  task-backend

# Start Frontend
docker run -d \
  --name task-frontend-app \
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
*(Note: The backend also contains auto-initialization code that creates the `tasks` table on startup if it doesn't exist).*

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
npx serve frontend
```
Or open [frontend/index.html](file:///home/onuigbo-precious/task-management/frontend/index.html) directly in any web browser.

---

## 📡 REST API Documentation

### Base URL: `http://localhost:5000/api`

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

### 1. `permission denied while trying to connect to the docker API`
Fix by adding your Linux user to the `docker` group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2. `listen tcp 0.0.0.0:5000: bind: address already in use`
A local Node.js process is occupying port 5000. Stop it with:
```bash
npx kill-port 5000
# or find the PID:
lsof -i :5000
```

### 3. `listen tcp 0.0.0.0:5432: bind: address already in use`
Your host machine has a native PostgreSQL service running on port 5432.
- The included `docker-compose.yml` maps PostgreSQL to host port **`5433`** to avoid this issue automatically.
- Alternatively, stop the local service: `sudo systemctl stop postgresql`.

### 4. `404 Not Found` when running `npx serve`
- If you are in the project root: run `npx serve frontend`
- If you are already inside the `frontend/` folder: run `npx serve .`
