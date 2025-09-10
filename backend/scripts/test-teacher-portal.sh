#!/bin/bash

# Teacher Portal API Test Script

set -e

echo "🧪 Testing Teacher Portal APIs..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

BASE_URL="http://localhost:${PORT:-3000}/api"

# Test health endpoint
echo "Testing health endpoint..."
if curl -s -f "$BASE_URL/health" > /dev/null; then
    echo "✅ Health endpoint responding"
else
    echo "❌ Health endpoint failed"
    exit 1
fi

# Test teacher routes (requires authentication)
echo "Testing teacher routes..."
echo "ℹ️  Note: Authentication required for full testing"

# List available endpoints
echo ""
echo "📋 Available Teacher Portal Endpoints:"
echo "  GET  $BASE_URL/teacher/dashboard"
echo "  GET  $BASE_URL/teacher/courses"
echo "  POST $BASE_URL/teacher/courses"
echo "  GET  $BASE_URL/teacher/courses/:id/students"
echo "  GET  $BASE_URL/teacher/courses/:id/assignments"
echo "  POST $BASE_URL/teacher/assignments"
echo "  GET  $BASE_URL/teacher/assignments/:id/submissions"
echo "  POST $BASE_URL/teacher/grade-submission"
echo "  GET  $BASE_URL/teacher/gradebook/:courseId"
echo "  POST $BASE_URL/teacher/send-feedback"
echo "  GET  $BASE_URL/teacher/analytics/course/:id"

echo ""
echo "✅ Test script completed"
echo "ℹ️  Use tools like Postman or curl with authentication for full API testing"
