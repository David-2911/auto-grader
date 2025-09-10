#!/bin/bash

# Script to apply authentication and security schema updates
echo "Starting application of authentication and security schema updates..."

# Database connection details (replace with actual values)
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"3306"}
DB_USER=${DB_USER:-"root"}
DB_PASS=${DB_PASS:-"password"}
DB_NAME=${DB_NAME:-"auto_grade"}

# First, apply the refresh tokens schema
echo "Applying refresh tokens schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < src/config/refresh_tokens_schema.sql

# Then, apply the auth security schema
echo "Applying authentication and security schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < src/config/auth_security_schema.sql

echo "Authentication and security schema updates completed."
