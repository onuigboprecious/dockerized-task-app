const db = require('../config/db');

const VALID_STATUSES = ['todo', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// Retrieve all tasks with optional filters
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;
    const conditions = [];
    const params = [];

    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const queryText = `
      SELECT id, title, description, status, priority, due_date, created_at, updated_at
      FROM tasks
      ${whereClause}
      ORDER BY 
        CASE status 
          WHEN 'todo' THEN 1 
          WHEN 'in_progress' THEN 2 
          WHEN 'completed' THEN 3 
          ELSE 4 
        END,
        created_at DESC
    `;

    const { rows } = await db.query(queryText, params);
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve single task by ID
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with id ${id} not found`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Create a new task
exports.createTask = async (req, res, next) => {
  try {
    let { title, description, status, priority, due_date } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    title = title.trim();
    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Task title must be 255 characters or fewer'
      });
    }

    status = status ? status.toLowerCase().trim() : 'todo';
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    priority = priority ? priority.toLowerCase().trim() : 'medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const dueDateVal = due_date && due_date !== '' ? due_date : null;

    const insertQuery = `
      INSERT INTO tasks (title, description, status, priority, due_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at
    `;

    const { rows } = await db.query(insertQuery, [
      title,
      description ? description.trim() : null,
      status,
      priority,
      dueDateVal
    ]);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing task
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { title, description, status, priority, due_date } = req.body;

    // Check if task exists
    const existing = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with id ${id} not found`
      });
    }

    const currentTask = existing.rows[0];

    const updatedTitle = title !== undefined ? title.trim() : currentTask.title;
    if (!updatedTitle) {
      return res.status(400).json({
        success: false,
        error: 'Task title cannot be empty'
      });
    }

    const updatedStatus = status !== undefined ? status.toLowerCase().trim() : currentTask.status;
    if (!VALID_STATUSES.includes(updatedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updatedPriority = priority !== undefined ? priority.toLowerCase().trim() : currentTask.priority;
    if (!VALID_PRIORITIES.includes(updatedPriority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const updatedDescription = description !== undefined ? (description ? description.trim() : null) : currentTask.description;
    const updatedDueDate = due_date !== undefined ? (due_date && due_date !== '' ? due_date : null) : currentTask.due_date;

    const updateQuery = `
      UPDATE tasks
      SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at
    `;

    const { rows } = await db.query(updateQuery, [
      updatedTitle,
      updatedDescription,
      updatedStatus,
      updatedPriority,
      updatedDueDate,
      id
    ]);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Patch task status (quick toggle/status update)
exports.patchTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    status = status.toLowerCase().trim();
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updateQuery = `
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at
    `;

    const { rows } = await db.query(updateQuery, [status, id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with id ${id} not found`
      });
    }

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete a task
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with id ${id} not found`
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      deletedId: rows[0].id
    });
  } catch (error) {
    next(error);
  }
};
