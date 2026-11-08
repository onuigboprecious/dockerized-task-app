/**
 * API Client for Task Management REST API
 * Connects to Node.js / Express backend with fallback to interactive local storage
 */

function getDefaultApiBase() {
  if (typeof window !== 'undefined') {
    // 1. Explicit overrides via window globals
    if (window.TASK_API_URL) return window.TASK_API_URL;
    if (window.ENV_API_URL) return window.ENV_API_URL;
    if (window.API_URL) return window.API_URL;

    // 2. Derive dynamically from current browser location
    if (window.location && window.location.hostname) {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:5000/api`;
    }
  }

  // 3. Fallback
  return 'http://localhost:5000/api';
}

let API_BASE = getDefaultApiBase();

const DEFAULT_DEMO_TASKS = [
  {
    id: 1,
    title: 'Design task dashboard UI',
    description: 'Create responsive glassmorphic layout and interactive task cards with status badges',
    status: 'completed',
    priority: 'high',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 2,
    title: 'Build Node.js REST API',
    description: 'Implement CRUD endpoints with PostgreSQL connection pooling and input validation',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    title: 'Add search and filter controls',
    description: 'Allow users to filter tasks by status, priority, and text search',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 345600000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Prepare Docker environment',
    description: 'Configure Dockerfiles and docker-compose orchestration for db, backend, and frontend',
    status: 'todo',
    priority: 'low',
    due_date: new Date(Date.now() + 604800000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
];

class TaskAPI {
  constructor() {
    this.apiBase = API_BASE;
    this.isBackendOnline = false;
    this.initLocalStorage();
  }

  initLocalStorage() {
    if (!localStorage.getItem('tm_tasks')) {
      localStorage.setItem('tm_tasks', JSON.stringify(DEFAULT_DEMO_TASKS));
    }
  }

  getLocalTasks() {
    return JSON.parse(localStorage.getItem('tm_tasks') || '[]');
  }

  saveLocalTasks(tasks) {
    localStorage.setItem('tm_tasks', JSON.stringify(tasks));
  }

  async checkHealth() {
    const candidateBases = [this.apiBase];

    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname } = window.location;
      const directUrl = `${protocol}//${hostname}:5000/api`;
      const relativeProxyUrl = '/api';

      [directUrl, relativeProxyUrl].forEach(url => {
        if (!candidateBases.includes(url)) candidateBases.push(url);
      });
    }

    for (const base of candidateBases) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${base}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          this.apiBase = base;
          API_BASE = base;
          this.isBackendOnline = (data.database === 'connected');
          return { online: true, database: data.database };
        }
      } catch (e) {
        // Try next candidate
      }
    }

    this.isBackendOnline = false;
    return { online: false, database: 'disconnected' };
  }

  async getTasks(params = {}) {
    if (this.isBackendOnline) {
      try {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.append('status', params.status);
        if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
        if (params.search) query.append('search', params.search);

        const res = await fetch(`${this.apiBase}/tasks?${query.toString()}`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to local storage:', err);
      }
    }

    // Local fallback
    let tasks = this.getLocalTasks();

    if (params.status && params.status !== 'all') {
      tasks = tasks.filter(t => t.status === params.status);
    }
    if (params.priority && params.priority !== 'all') {
      tasks = tasks.filter(t => t.priority === params.priority);
    }
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      tasks = tasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return tasks;
  }

  async createTask(taskData) {
    if (this.isBackendOnline) {
      try {
        const res = await fetch(`${this.apiBase}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create task');
        }
        const result = await res.json();
        return result.data;
      } catch (err) {
        if (this.isBackendOnline) throw err;
      }
    }

    // Local fallback
    const tasks = this.getLocalTasks();
    const newTask = {
      id: Date.now(),
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    this.saveLocalTasks(tasks);
    return newTask;
  }

  async updateTask(id, taskData) {
    if (this.isBackendOnline) {
      try {
        const res = await fetch(`${this.apiBase}/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update task');
        }
        const result = await res.json();
        return result.data;
      } catch (err) {
        if (this.isBackendOnline) throw err;
      }
    }

    // Local fallback
    const tasks = this.getLocalTasks();
    const index = tasks.findIndex(t => t.id == id);
    if (index === -1) throw new Error('Task not found');
    tasks[index] = {
      ...tasks[index],
      ...taskData,
      updated_at: new Date().toISOString()
    };
    this.saveLocalTasks(tasks);
    return tasks[index];
  }

  async patchStatus(id, status) {
    if (this.isBackendOnline) {
      try {
        const res = await fetch(`${this.apiBase}/tasks/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update status');
        }
        const result = await res.json();
        return result.data;
      } catch (err) {
        if (this.isBackendOnline) throw err;
      }
    }

    // Local fallback
    return this.updateTask(id, { status });
  }

  async deleteTask(id) {
    if (this.isBackendOnline) {
      try {
        const res = await fetch(`${this.apiBase}/tasks/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete task');
        }
        return true;
      } catch (err) {
        if (this.isBackendOnline) throw err;
      }
    }

    // Local fallback
    const tasks = this.getLocalTasks();
    const filtered = tasks.filter(t => t.id != id);
    this.saveLocalTasks(filtered);
    return true;
  }
}

window.taskAPI = new TaskAPI();
