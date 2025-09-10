#!/bin/bash

# Auto-Grader System: Final Validation and Readiness Assessment
# This script performs critical system validation before production launch

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to track test results
track_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$1" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        success "$2"
    elif [ "$1" == "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        error "$2"
    else
        WARNINGS=$((WARNINGS + 1))
        warning "$2"
    fi
}

echo "=============================================="
echo "Auto-Grader Final System Validation"
echo "=============================================="
echo "Started at: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found. Please run from the Auto-grade root directory."
    exit 1
fi

log "Starting comprehensive system validation..."

# Phase 1: Infrastructure Health Check
log "=== Phase 1: Infrastructure Health Check ==="

# Check Docker availability
if command -v docker &> /dev/null && docker info >/dev/null 2>&1; then
    track_test "PASS" "Docker is available and running"
else
    track_test "FAIL" "Docker is not available or not running"
fi

# Check Docker Compose availability
if command -v docker-compose &> /dev/null; then
    track_test "PASS" "Docker Compose is available"
else
    track_test "FAIL" "Docker Compose is not available"
fi

# Start services if not running
log "Checking and starting required services..."
docker-compose up -d --quiet-pull 2>/dev/null || {
    track_test "FAIL" "Failed to start Docker services"
}

# Wait for services to be ready
log "Waiting for services to initialize..."
sleep 30

# Check service health
log "Checking service health..."

# MySQL health check
if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p"${DB_ROOT_PASSWORD:-password}" >/dev/null 2>&1; then
    track_test "PASS" "MySQL database is healthy"
else
    track_test "FAIL" "MySQL database health check failed"
fi

# Redis health check
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    track_test "PASS" "Redis cache is healthy"
else
    track_test "FAIL" "Redis cache health check failed"
fi

# Backend health check
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")
if [ "$BACKEND_HEALTH" == "200" ]; then
    track_test "PASS" "Backend API is responding"
else
    track_test "FAIL" "Backend API health check failed (HTTP $BACKEND_HEALTH)"
fi

# Frontend health check (if running)
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$FRONTEND_HEALTH" == "200" ]; then
    track_test "PASS" "Frontend application is responding"
elif [ "$FRONTEND_HEALTH" == "000" ]; then
    track_test "WARN" "Frontend not running (may be expected in backend-only testing)"
else
    track_test "FAIL" "Frontend application health check failed (HTTP $FRONTEND_HEALTH)"
fi

# Phase 2: Critical API Functionality Testing
log "=== Phase 2: Critical API Functionality Testing ==="

API_BASE="http://localhost:5000/api"

# Test user registration
log "Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_validation@example.com","password":"TestPass123!","firstName":"Test","lastName":"User","role":"student"}' \
  -w "%{http_code}" -o /tmp/register_response.json)

REGISTER_CODE=$(echo "$REGISTER_RESPONSE" | tail -c 4)
if [ "$REGISTER_CODE" == "200" ] || [ "$REGISTER_CODE" == "201" ]; then
    track_test "PASS" "User registration functionality working"
    # Extract token for further tests
    TOKEN=$(cat /tmp/register_response.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    track_test "FAIL" "User registration failed (HTTP $REGISTER_CODE)"
    TOKEN=""
fi

# Test user login
log "Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_validation@example.com","password":"TestPass123!"}' \
  -w "%{http_code}" -o /tmp/login_response.json)

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -c 4)
if [ "$LOGIN_CODE" == "200" ]; then
    track_test "PASS" "User login functionality working"
    if [ -z "$TOKEN" ]; then
        TOKEN=$(cat /tmp/login_response.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
else
    track_test "FAIL" "User login failed (HTTP $LOGIN_CODE)"
fi

# Test authenticated endpoint
if [ ! -z "$TOKEN" ]; then
    log "Testing authenticated endpoint access..."
    PROFILE_RESPONSE=$(curl -s -X GET "$API_BASE/auth/profile" \
      -H "Authorization: Bearer $TOKEN" \
      -w "%{http_code}" -o /tmp/profile_response.json)
    
    PROFILE_CODE=$(echo "$PROFILE_RESPONSE" | tail -c 4)
    if [ "$PROFILE_CODE" == "200" ]; then
        track_test "PASS" "Authentication system working properly"
    else
        track_test "FAIL" "Authentication system failed (HTTP $PROFILE_CODE)"
    fi
else
    track_test "FAIL" "Cannot test authenticated endpoints - no valid token"
fi

# Phase 3: Database Connectivity and Basic Operations
log "=== Phase 3: Database Connectivity and Operations ==="

# Test database connection from backend
log "Testing database operations..."
DB_TEST_RESPONSE=$(curl -s -X GET "$API_BASE/health/database" -w "%{http_code}" -o /tmp/db_response.json 2>/dev/null || echo "000")
DB_TEST_CODE=$(echo "$DB_TEST_RESPONSE" | tail -c 4)

if [ "$DB_TEST_CODE" == "200" ]; then
    track_test "PASS" "Database connectivity and operations working"
else
    track_test "FAIL" "Database operations test failed (HTTP $DB_TEST_CODE)"
fi

# Test Redis connectivity
log "Testing cache operations..."
CACHE_TEST_RESPONSE=$(curl -s -X GET "$API_BASE/health/cache" -w "%{http_code}" -o /tmp/cache_response.json 2>/dev/null || echo "000")
CACHE_TEST_CODE=$(echo "$CACHE_TEST_RESPONSE" | tail -c 4)

if [ "$CACHE_TEST_CODE" == "200" ]; then
    track_test "PASS" "Cache connectivity and operations working"
else
    track_test "WARN" "Cache operations test failed (HTTP $CACHE_TEST_CODE) - may be non-critical"
fi

# Phase 4: File Operations Testing
log "=== Phase 4: File Operations Testing ==="

# Create a test file
echo "This is a test submission file for validation." > /tmp/test_submission.txt

# Test file upload (if we have a valid token)
if [ ! -z "$TOKEN" ]; then
    log "Testing file upload functionality..."
    
    # First, try to create a test assignment (this might fail if we don't have teacher permissions)
    UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/test/file-upload" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@/tmp/test_submission.txt" \
      -w "%{http_code}" -o /tmp/upload_response.json 2>/dev/null || echo "000")
    
    UPLOAD_CODE=$(echo "$UPLOAD_RESPONSE" | tail -c 4)
    if [ "$UPLOAD_CODE" == "200" ] || [ "$UPLOAD_CODE" == "201" ]; then
        track_test "PASS" "File upload functionality working"
    elif [ "$UPLOAD_CODE" == "404" ]; then
        track_test "WARN" "File upload endpoint not available (may be expected)"
    else
        track_test "FAIL" "File upload test failed (HTTP $UPLOAD_CODE)"
    fi
else
    track_test "WARN" "Cannot test file upload - no authentication token"
fi

# Clean up test file
rm -f /tmp/test_submission.txt

# Phase 5: Performance Baseline Check
log "=== Phase 5: Performance Baseline Check ==="

# Test API response times
log "Measuring API response times..."

# Test multiple endpoints for response time
declare -a endpoints=("/health" "/api/health" "/api/auth/health")
total_response_time=0
successful_tests=0

for endpoint in "${endpoints[@]}"; do
    start_time=$(date +%s%N)
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$endpoint" 2>/dev/null || echo "000")
    end_time=$(date +%s%N)
    
    if [ "$response_code" == "200" ]; then
        response_time=$(( ($end_time - $start_time) / 1000000 )) # Convert to milliseconds
        total_response_time=$((total_response_time + response_time))
        successful_tests=$((successful_tests + 1))
        
        if [ $response_time -lt 2000 ]; then
            info "Endpoint $endpoint: ${response_time}ms (GOOD)"
        else
            warning "Endpoint $endpoint: ${response_time}ms (SLOW)"
        fi
    fi
done

if [ $successful_tests -gt 0 ]; then
    avg_response_time=$((total_response_time / successful_tests))
    if [ $avg_response_time -lt 2000 ]; then
        track_test "PASS" "Average response time: ${avg_response_time}ms (within target)"
    else
        track_test "WARN" "Average response time: ${avg_response_time}ms (exceeds 2s target)"
    fi
else
    track_test "FAIL" "No successful response time measurements"
fi

# Phase 6: Security Baseline Check
log "=== Phase 6: Security Baseline Check ==="

# Test for basic security headers
log "Checking security headers..."
SECURITY_HEADERS=$(curl -s -I "http://localhost:5000/health" 2>/dev/null | tr -d '\r')

if echo "$SECURITY_HEADERS" | grep -qi "x-frame-options"; then
    track_test "PASS" "X-Frame-Options security header present"
else
    track_test "WARN" "X-Frame-Options security header missing"
fi

if echo "$SECURITY_HEADERS" | grep -qi "x-content-type-options"; then
    track_test "PASS" "X-Content-Type-Options security header present"
else
    track_test "WARN" "X-Content-Type-Options security header missing"
fi

# Test authentication bypass attempts
log "Testing authentication security..."
BYPASS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/auth/profile" 2>/dev/null || echo "000")

if [ "$BYPASS_RESPONSE" == "401" ]; then
    track_test "PASS" "Authentication properly blocks unauthorized access"
else
    track_test "FAIL" "Authentication bypass possible (HTTP $BYPASS_RESPONSE)"
fi

# Phase 7: System Resource Check
log "=== Phase 7: System Resource Check ==="

# Check available disk space
log "Checking system resources..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    track_test "PASS" "Disk usage: ${DISK_USAGE}% (adequate space available)"
else
    track_test "WARN" "Disk usage: ${DISK_USAGE}% (consider cleanup)"
fi

# Check memory usage if possible
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$MEMORY_USAGE" -lt 80 ]; then
        track_test "PASS" "Memory usage: ${MEMORY_USAGE}% (within acceptable range)"
    else
        track_test "WARN" "Memory usage: ${MEMORY_USAGE}% (consider monitoring)"
    fi
fi

# Check Docker container status
log "Checking container status..."
RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
TOTAL_CONTAINERS=$(docker-compose ps --services | wc -l)

if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ] && [ "$RUNNING_CONTAINERS" -gt 0 ]; then
    track_test "PASS" "All containers running ($RUNNING_CONTAINERS/$TOTAL_CONTAINERS)"
else
    track_test "FAIL" "Container issues detected ($RUNNING_CONTAINERS/$TOTAL_CONTAINERS running)"
fi

# Phase 8: Final Validation Summary
log "=== Phase 8: Final Validation Summary ==="

echo ""
echo "=============================================="
echo "FINAL VALIDATION RESULTS"
echo "=============================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Warnings: $WARNINGS"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "Success Rate: ${SUCCESS_RATE}%"
else
    echo "Success Rate: 0% (No tests executed)"
    SUCCESS_RATE=0
fi

echo ""

# Determine overall system readiness
if [ $FAILED_TESTS -eq 0 ] && [ $SUCCESS_RATE -ge 85 ]; then
    echo -e "${GREEN}🎉 SYSTEM VALIDATION: PASSED${NC}"
    echo -e "${GREEN}✅ System is ready for production deployment${NC}"
    READINESS_STATUS="READY"
elif [ $FAILED_TESTS -le 2 ] && [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  SYSTEM VALIDATION: CONDITIONAL PASS${NC}"
    echo -e "${YELLOW}⚠️  System may be ready with minor issues addressed${NC}"
    READINESS_STATUS="CONDITIONAL"
else
    echo -e "${RED}❌ SYSTEM VALIDATION: FAILED${NC}"
    echo -e "${RED}❌ System requires significant fixes before production${NC}"
    READINESS_STATUS="NOT_READY"
fi

echo ""
echo "=============================================="

# Generate recommendations
echo "RECOMMENDATIONS:"
echo "=============================================="

if [ $FAILED_TESTS -gt 0 ]; then
    echo "🔧 Address all failed tests before production deployment"
fi

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Review and consider addressing warning items"
fi

if [ $SUCCESS_RATE -lt 95 ]; then
    echo "📊 Run additional testing to improve success rate"
fi

echo "📋 Review detailed logs for specific issues"
echo "🔄 Re-run validation after addressing any issues"
echo "📖 Consult troubleshooting documentation for guidance"

# Cleanup temporary files
rm -f /tmp/register_response.json /tmp/login_response.json /tmp/profile_response.json
rm -f /tmp/db_response.json /tmp/cache_response.json /tmp/upload_response.json

echo ""
echo "Validation completed at: $(date)"

# Exit with appropriate code
case $READINESS_STATUS in
    "READY")
        exit 0
        ;;
    "CONDITIONAL")
        exit 1
        ;;
    "NOT_READY")
        exit 2
        ;;
    *)
        exit 3
        ;;
esac
