const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Task CRUD routes
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.patch('/:id/status', taskController.patchTaskStatus);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
