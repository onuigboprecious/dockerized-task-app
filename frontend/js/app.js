/**
 * Main Application Logic for Task Management Frontend
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentTasks = [];
  let activeStatusFilter = 'all';
  let activePriorityFilter = 'all';
  let searchQuery = '';
  let activeView = 'board'; // 'board' or 'list'
  let deletingTaskId = null;

  // DOM Elements
  const connectionBadge = document.getElementById('connection-badge');
  const connectionText = document.getElementById('connection-text');
  const searchInput = document.getElementById('search-input');
  const prioritySelect = document.getElementById('priority-filter');
  const filterPills = document.querySelectorAll('.filter-pill');
  const kanbanBoard = document.getElementById('kanban-board');
  const newBtn = document.getElementById('new-task-btn');
  const toastContainer = document.getElementById('toast-container');

  // Stats Elements
  const totalTasksCount = document.getElementById('stat-total');
  const todoTasksCount = document.getElementById('stat-todo');
  const inProgressTasksCount = document.getElementById('stat-in-progress');
  const completedTasksCount = document.getElementById('stat-completed');

  // Modals
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const modalTitle = document.getElementById('modal-title');
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Light dismiss helper for native <dialog>
  [taskModal, deleteModal].forEach(dialog => {
    if (!dialog) return;
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  });

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 200ms ease-in forwards';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  // Health check and connection monitor
  async function checkBackendStatus() {
    const health = await window.taskAPI.checkHealth();
    if (health.online && health.database === 'connected') {
      connectionBadge.className = 'connection-badge connected';
      connectionText.textContent = 'Connected: PostgreSQL';
    } else if (health.online) {
      connectionBadge.className = 'connection-badge demo';
      connectionText.textContent = 'Backend Live (DB Offline - Demo Mode)';
    } else {
      connectionBadge.className = 'connection-badge demo';
      connectionText.textContent = 'Demo Mode (Backend Offline)';
    }
  }

  // Fetch and display tasks
  async function loadTasks() {
    try {
      currentTasks = await window.taskAPI.getTasks({
        status: activeStatusFilter,
        priority: activePriorityFilter,
        search: searchQuery
      });
      renderTasks();
      updateStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Update Statistics
  async function updateStats() {
    const all = await window.taskAPI.getTasks({});
    const total = all.length;
    const todo = all.filter(t => t.status === 'todo').length;
    const inProg = all.filter(t => t.status === 'in_progress').length;
    const completed = all.filter(t => t.status === 'completed').length;

    totalTasksCount.textContent = total;
    todoTasksCount.textContent = todo;
    inProgressTasksCount.textContent = inProg;
    completedTasksCount.textContent = completed;

    // Update pill counts
    document.querySelectorAll('.filter-pill').forEach(pill => {
      const status = pill.dataset.status;
      const badge = pill.querySelector('.badge');
      if (status === 'all') badge.textContent = total;
      if (status === 'todo') badge.textContent = todo;
      if (status === 'in_progress') badge.textContent = inProg;
      if (status === 'completed') badge.textContent = completed;
    });
  }

  // Render Tasks
  function renderTasks() {
    const columns = {
      todo: document.getElementById('tasks-todo'),
      in_progress: document.getElementById('tasks-in-progress'),
      completed: document.getElementById('tasks-completed')
    };

    // Clear columns
    Object.values(columns).forEach(col => col.innerHTML = '');

    const grouped = {
      todo: currentTasks.filter(t => t.status === 'todo'),
      in_progress: currentTasks.filter(t => t.status === 'in_progress'),
      completed: currentTasks.filter(t => t.status === 'completed')
    };

    document.getElementById('count-todo').textContent = grouped.todo.length;
    document.getElementById('count-in-progress').textContent = grouped.in_progress.length;
    document.getElementById('count-completed').textContent = grouped.completed.length;

    ['todo', 'in_progress', 'completed'].forEach(status => {
      const container = columns[status];
      const list = grouped[status];

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No tasks in this stage</p>
          </div>
        `;
        return;
      }

      list.forEach(task => {
        container.appendChild(createTaskCard(task));
      });
    });
  }

  // Build card DOM element
  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.id = `task-card-${task.id}`;

    const formattedDate = task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) : null;

    const isOverdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date().setHours(0,0,0,0);

    card.innerHTML = `
      <div class="task-card-header">
        <span class="priority-badge priority-${task.priority || 'medium'}">
          ${task.priority || 'medium'}
        </span>
        <select class="status-select-card" aria-label="Change status" data-id="${task.id}">
          <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <h4 class="task-title">${escapeHTML(task.title)}</h4>
      ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
      <div class="task-footer">
        ${formattedDate ? `
          <span class="due-date ${isOverdue ? 'overdue' : ''}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ${isOverdue ? 'Overdue: ' : 'Due '}${formattedDate}
          </span>
        ` : '<span></span>'}
        <div class="card-actions">
          <button class="action-icon-btn edit-task-btn" title="Edit Task" data-id="${task.id}">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button class="action-icon-btn delete delete-task-btn" title="Delete Task" data-id="${task.id}">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;

    // Event listeners on card elements
    const statusSelect = card.querySelector('.status-select-card');
    statusSelect.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        await window.taskAPI.patchStatus(task.id, newStatus);
        showToast(`Status updated to "${newStatus.replace('_', ' ')}"`, 'success');
        loadTasks();
      } catch (err) {
        showToast(err.message, 'error');
        statusSelect.value = task.status;
      }
    });

    const editBtn = card.querySelector('.edit-task-btn');
    editBtn.addEventListener('click', () => openEditModal(task));

    const deleteBtn = card.querySelector('.delete-task-btn');
    deleteBtn.addEventListener('click', () => openDeleteModal(task.id));

    return card;
  }

  // Open Modal for Create
  function openCreateModal() {
    taskForm.reset();
    document.getElementById('task-id').value = '';
    modalTitle.textContent = 'Create New Task';
    taskModal.showModal();
    document.getElementById('task-title').focus();
  }

  // Open Modal for Edit
  function openEditModal(task) {
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status || 'todo';
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-due-date').value = task.due_date ? task.due_date.split('T')[0] : '';
    modalTitle.textContent = 'Edit Task';
    taskModal.showModal();
    document.getElementById('task-title').focus();
  }

  // Open Modal for Delete Confirmation
  function openDeleteModal(id) {
    deletingTaskId = id;
    deleteModal.showModal();
  }

  // Modal close buttons
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      taskModal.close();
      deleteModal.close();
    });
  });

  // Task form submission
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const taskData = {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-desc').value.trim(),
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      due_date: document.getElementById('task-due-date').value || null
    };

    if (!taskData.title) {
      showToast('Task title is required', 'error');
      return;
    }

    try {
      if (id) {
        await window.taskAPI.updateTask(id, taskData);
        showToast('Task updated successfully!', 'success');
      } else {
        await window.taskAPI.createTask(taskData);
        showToast('Task created successfully!', 'success');
      }
      taskModal.close();
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Delete confirmation
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!deletingTaskId) return;
    try {
      await window.taskAPI.deleteTask(deletingTaskId);
      showToast('Task deleted successfully', 'success');
      deleteModal.close();
      deletingTaskId = null;
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.close();
    deletingTaskId = null;
  });

  // Search input debounced
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value;
      loadTasks();
    }, 250);
  });

  // Status Filter Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStatusFilter = pill.dataset.status;
      loadTasks();
    });
  });

  // Priority Filter Select
  prioritySelect.addEventListener('change', (e) => {
    activePriorityFilter = e.target.value;
    loadTasks();
  });

  // New task button
  newBtn.addEventListener('click', openCreateModal);

  // Keyboard shortcut: Press 'N' to open new task modal (when not inside an input)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openCreateModal();
    }
  });

  // Utility to prevent XSS
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load & periodic health checking
  checkBackendStatus();
  loadTasks();
  setInterval(checkBackendStatus, 5000);
});
