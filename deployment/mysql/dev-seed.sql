-- Development seed data for Auto-Grade
USE auto_grade;

-- Create an admin user with a known password hash (bcrypt of 'admin123')
INSERT INTO users (email, password, role, identifier, first_name, last_name, is_active)
VALUES ('admin@example.com', '$2b$10$0j6mVXW6UoW3TqkZcJH1Iu5kE/2kzF2n7Y9u5mH8gQJxU9gfG0J6C', 'admin', 'ADM-0001', 'System', 'Admin', 1)
ON DUPLICATE KEY UPDATE email = email;

-- Basic teacher
INSERT INTO users (email, password, role, identifier, first_name, last_name, is_active)
VALUES ('teacher@example.com', '$2b$10$0j6mVXW6UoW3TqkZcJH1Iu5kE/2kzF2n7Y9u5mH8gQJxU9gfG0J6C', 'teacher', 'TCH-0001', 'Jane', 'Doe', 1)
ON DUPLICATE KEY UPDATE email = email;

-- Basic student
INSERT INTO users (email, password, role, identifier, first_name, last_name, is_active)
VALUES ('student@example.com', '$2b$10$0j6mVXW6UoW3TqkZcJH1Iu5kE/2kzF2n7Y9u5mH8gQJxU9gfG0J6C', 'student', 'STD-0001', 'John', 'Smith', 1)
ON DUPLICATE KEY UPDATE email = email;
