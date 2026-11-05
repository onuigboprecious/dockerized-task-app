-- Database initialization script for Task Management Application

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering tasks by status and priority
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed initial tasks for testing
INSERT INTO tasks (title, description, status, priority, due_date)
VALUES
    ('Design task dashboard UI', 'Create responsive glassmorphic layout and interactive task cards with status badges', 'completed', 'high', CURRENT_DATE + INTERVAL '1 day'),
    ('Build Node.js REST API', 'Implement CRUD endpoints with PostgreSQL connection pooling and input validation', 'in_progress', 'high', CURRENT_DATE + INTERVAL '2 days'),
    ('Add search and filter controls', 'Allow users to filter tasks by status, priority, and text search', 'todo', 'medium', CURRENT_DATE + INTERVAL '4 days'),
    ('Prepare Docker environment', 'Configure Dockerfiles and docker-compose orchestration for db, backend, and frontend', 'todo', 'low', CURRENT_DATE + INTERVAL '7 days')
ON CONFLICT DO NOTHING;
