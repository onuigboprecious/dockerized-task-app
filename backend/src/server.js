const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow frontend development requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/tasks', taskRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Task Management REST API is running',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      tasks: {
        list: 'GET /api/tasks',
        create: 'POST /api/tasks',
        getOne: 'GET /api/tasks/:id',
        update: 'PUT /api/tasks/:id',
        patchStatus: 'PATCH /api/tasks/:id/status',
        delete: 'DELETE /api/tasks/:id'
      }
    }
  });
});

// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  let statusCode = err.status || 500;
  let errorMessage = err.message || 'Internal Server Error';

  if (err.code === '28P01') {
    statusCode = 503;
    errorMessage = 'Database authentication failed. Please check DB_USER and DB_PASSWORD in backend/.env.';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorMessage = 'Cannot connect to PostgreSQL. Please ensure the database server is running.';
  } else if (err.code === '3D000') {
    statusCode = 503;
    errorMessage = `Database "${process.env.DB_NAME || 'taskdb'}" does not exist. Please create it or run database/init.sql.`;
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, errorMessage);
  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
});

// Start Server and verify DB connection
const startServer = async () => {
  await initDB();
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Task Management API listening on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📋 Tasks API:    http://localhost:${PORT}/api/tasks`);
    console.log(`===============================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
      console.error(`💡 Tip: Run 'lsof -i :${PORT}' or 'fuser -k ${PORT}/tcp' to stop it, or change PORT in backend/.env.\n`);
    } else {
      console.error('Server startup error:', err);
    }
    process.exit(1);
  });
};

startServer();

module.exports = app;
