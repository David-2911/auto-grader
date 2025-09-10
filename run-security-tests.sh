#!/bin/bash

# Auto-Grader Security Testing Suite
# Comprehensive security validation for production readiness

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

SECURITY_REPORT="security-test-report-$(date +%Y%m%d-%H%M%S).txt"

echo "=====================================" | tee "$SECURITY_REPORT"
echo "Auto-Grader Security Testing Report" | tee -a "$SECURITY_REPORT"
echo "Generated: $(date)" | tee -a "$SECURITY_REPORT"
echo "=====================================" | tee -a "$SECURITY_REPORT"
echo "" | tee -a "$SECURITY_REPORT"

# Test 1: Authentication Security
log "Testing Authentication Security..."
echo "1. AUTHENTICATION SECURITY TESTS" | tee -a "$SECURITY_REPORT"
echo "=================================" | tee -a "$SECURITY_REPORT"

# JWT Token Security Test
API_URL="http://localhost:5000"

# Test weak password policy
echo "Testing password policy enforcement..." | tee -a "$SECURITY_REPORT"
WEAK_PASSWORD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123","firstName":"Test","lastName":"User","role":"student"}')

if [ "$WEAK_PASSWORD_RESPONSE" == "400" ]; then
    success "Password policy enforcement: PASS" | tee -a "$SECURITY_REPORT"
else
    error "Password policy enforcement: FAIL (accepts weak passwords)" | tee -a "$SECURITY_REPORT"
fi

# Test SQL injection in login
echo "Testing SQL injection resistance..." | tee -a "$SECURITY_REPORT"
SQL_INJECTION_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\''OR'\''1'\''='\''1","password":"anything"}')

if [ "$SQL_INJECTION_RESPONSE" == "401" ] || [ "$SQL_INJECTION_RESPONSE" == "400" ]; then
    success "SQL injection resistance: PASS" | tee -a "$SECURITY_REPORT"
else
    error "SQL injection resistance: FAIL" | tee -a "$SECURITY_REPORT"
fi

# Test JWT token manipulation
echo "Testing JWT token security..." | tee -a "$SECURITY_REPORT"
INVALID_TOKEN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/auth/profile" \
  -H "Authorization: Bearer invalid.jwt.token")

if [ "$INVALID_TOKEN_RESPONSE" == "401" ]; then
    success "JWT token validation: PASS" | tee -a "$SECURITY_REPORT"
else
    error "JWT token validation: FAIL" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Test 2: Authorization Controls
log "Testing Authorization Controls..."
echo "2. AUTHORIZATION CONTROL TESTS" | tee -a "$SECURITY_REPORT"
echo "==============================" | tee -a "$SECURITY_REPORT"

# Test role-based access control
echo "Testing role-based access control..." | tee -a "$SECURITY_REPORT"

# First register a student user
STUDENT_REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"student_security@test.com","password":"SecurePass123!","firstName":"Security","lastName":"Student","role":"student"}')

STUDENT_TOKEN=$(echo "$STUDENT_REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$STUDENT_TOKEN" ]; then
    # Try to access admin-only endpoint with student token
    ADMIN_ACCESS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/admin/users" \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    
    if [ "$ADMIN_ACCESS_RESPONSE" == "403" ]; then
        success "Role-based access control: PASS" | tee -a "$SECURITY_REPORT"
    else
        error "Role-based access control: FAIL (student can access admin endpoints)" | tee -a "$SECURITY_REPORT"
    fi
else
    warning "Could not test RBAC - student registration failed" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Test 3: Input Validation and XSS Protection
log "Testing Input Validation and XSS Protection..."
echo "3. INPUT VALIDATION AND XSS TESTS" | tee -a "$SECURITY_REPORT"
echo "==================================" | tee -a "$SECURITY_REPORT"

# Test XSS in profile update
echo "Testing XSS protection..." | tee -a "$SECURITY_REPORT"
XSS_PAYLOAD='<script>alert("xss")</script>'

if [ ! -z "$STUDENT_TOKEN" ]; then
    XSS_RESPONSE=$(curl -s -X PUT "$API_URL/api/auth/profile" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"firstName\":\"$XSS_PAYLOAD\",\"lastName\":\"Test\"}")
    
    # Check if the response contains the script tag (which would be bad)
    if echo "$XSS_RESPONSE" | grep -q "<script>"; then
        error "XSS protection: FAIL (script tags not sanitized)" | tee -a "$SECURITY_REPORT"
    else
        success "XSS protection: PASS" | tee -a "$SECURITY_REPORT"
    fi
else
    warning "Could not test XSS protection - no valid token" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Test 4: File Upload Security
log "Testing File Upload Security..."
echo "4. FILE UPLOAD SECURITY TESTS" | tee -a "$SECURITY_REPORT"
echo "==============================" | tee -a "$SECURITY_REPORT"

# Test malicious file upload
echo "Testing file type validation..." | tee -a "$SECURITY_REPORT"

# Create a test malicious file
echo '<?php system($_GET["cmd"]); ?>' > /tmp/malicious.php

if [ ! -z "$STUDENT_TOKEN" ]; then
    MALICIOUS_UPLOAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/assignments/submit" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -F "assignmentId=test" \
      -F "submissionFile=@/tmp/malicious.php")
    
    if [ "$MALICIOUS_UPLOAD_RESPONSE" == "400" ] || [ "$MALICIOUS_UPLOAD_RESPONSE" == "415" ]; then
        success "File type validation: PASS" | tee -a "$SECURITY_REPORT"
    else
        error "File type validation: FAIL (accepts PHP files)" | tee -a "$SECURITY_REPORT"
    fi
else
    warning "Could not test file upload security - no valid token" | tee -a "$SECURITY_REPORT"
fi

# Clean up test file
rm -f /tmp/malicious.php

echo "" | tee -a "$SECURITY_REPORT"

# Test 5: Rate Limiting
log "Testing Rate Limiting..."
echo "5. RATE LIMITING TESTS" | tee -a "$SECURITY_REPORT"
echo "======================" | tee -a "$SECURITY_REPORT"

echo "Testing login rate limiting..." | tee -a "$SECURITY_REPORT"

# Attempt multiple rapid login requests
RATE_LIMIT_COUNT=0
for i in {1..20}; do
    RATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"nonexistent@test.com","password":"wrongpassword"}')
    
    if [ "$RATE_RESPONSE" == "429" ]; then
        RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
    fi
    
    sleep 0.1
done

if [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
    success "Rate limiting: PASS (triggered after $RATE_LIMIT_COUNT requests)" | tee -a "$SECURITY_REPORT"
else
    warning "Rate limiting: UNKNOWN (may not be triggered in test timeframe)" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Test 6: HTTPS and Security Headers
log "Testing Security Headers..."
echo "6. SECURITY HEADERS TESTS" | tee -a "$SECURITY_REPORT"
echo "==========================" | tee -a "$SECURITY_REPORT"

# Test security headers
HEADERS_RESPONSE=$(curl -s -I "$API_URL/api/health" | tr -d '\r')

echo "Checking security headers..." | tee -a "$SECURITY_REPORT"

# Check for important security headers
if echo "$HEADERS_RESPONSE" | grep -qi "x-frame-options"; then
    success "X-Frame-Options header: PRESENT" | tee -a "$SECURITY_REPORT"
else
    warning "X-Frame-Options header: MISSING" | tee -a "$SECURITY_REPORT"
fi

if echo "$HEADERS_RESPONSE" | grep -qi "x-content-type-options"; then
    success "X-Content-Type-Options header: PRESENT" | tee -a "$SECURITY_REPORT"
else
    warning "X-Content-Type-Options header: MISSING" | tee -a "$SECURITY_REPORT"
fi

if echo "$HEADERS_RESPONSE" | grep -qi "strict-transport-security"; then
    success "Strict-Transport-Security header: PRESENT" | tee -a "$SECURITY_REPORT"
else
    warning "Strict-Transport-Security header: MISSING (expected in HTTPS)" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Test 7: Database Security
log "Testing Database Security..."
echo "7. DATABASE SECURITY TESTS" | tee -a "$SECURITY_REPORT"
echo "===========================" | tee -a "$SECURITY_REPORT"

# Check if database is accessible externally
echo "Testing database external access..." | tee -a "$SECURITY_REPORT"

DB_EXTERNAL_ACCESS=$(timeout 5 nc -z localhost 3306 2>/dev/null && echo "accessible" || echo "not accessible")

if [ "$DB_EXTERNAL_ACCESS" == "accessible" ]; then
    warning "Database external access: EXPOSED (should be restricted in production)" | tee -a "$SECURITY_REPORT"
else
    success "Database external access: RESTRICTED" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"

# Summary
echo "SECURITY TEST SUMMARY" | tee -a "$SECURITY_REPORT"
echo "=====================" | tee -a "$SECURITY_REPORT"

PASS_COUNT=$(grep -c "PASS" "$SECURITY_REPORT")
FAIL_COUNT=$(grep -c "FAIL" "$SECURITY_REPORT")
WARN_COUNT=$(grep -c "WARN\|UNKNOWN" "$SECURITY_REPORT")

echo "Tests Passed: $PASS_COUNT" | tee -a "$SECURITY_REPORT"
echo "Tests Failed: $FAIL_COUNT" | tee -a "$SECURITY_REPORT"
echo "Warnings: $WARN_COUNT" | tee -a "$SECURITY_REPORT"

if [ "$FAIL_COUNT" -eq 0 ]; then
    success "Security testing completed with no critical failures"
    echo "OVERALL SECURITY STATUS: ACCEPTABLE FOR PRODUCTION" | tee -a "$SECURITY_REPORT"
else
    error "Security testing found $FAIL_COUNT critical issues"
    echo "OVERALL SECURITY STATUS: REQUIRES ATTENTION BEFORE PRODUCTION" | tee -a "$SECURITY_REPORT"
fi

echo "" | tee -a "$SECURITY_REPORT"
echo "Detailed security report saved to: $SECURITY_REPORT"

# Return appropriate exit code
if [ "$FAIL_COUNT" -eq 0 ]; then
    exit 0
else
    exit 1
fi
