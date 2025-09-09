ALTER TABLE assignments
  ADD COLUMN question_pdf VARCHAR(255),
  ADD COLUMN nbgrader_expectation TEXT;

ALTER TABLE submissions
  ADD COLUMN submission_pdf VARCHAR(255);
