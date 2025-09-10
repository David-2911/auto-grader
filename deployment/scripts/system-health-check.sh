#!/bin/bash

# Auto-Grader System Health Check Script
# This script performs comprehensive system health checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_CHECK_TIMEOUT=30
LOG_FILE="/tmp/system_health_check.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*${NC}" | tee -a "$LOG_FILE"
    ((PASSED_CHECKS++))
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*${NC}" | tee -a "$LOG_FILE"
    ((FAILED_CHECKS++))
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*${NC}" | tee -a "$LOG_FILE"
    ((WARNING_CHECKS++))
}

# Health check functions
check_docker_status() {
    log "Checking Docker status..."
    ((TOTAL_CHECKS++))
    
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            success "Docker is running"
        else
            error "Docker is installed but not running"
            return 1
        fi
    else
        error "Docker is not installed"
        return 1
    fi
}

check_docker_compose_status() {
    log "Checking Docker Compose status..."
    ((TOTAL_CHECKS++))
    
    if command -v docker-compose &> /dev/null; then
        success "Docker Compose is available"
    else
        error "Docker Compose is not installed"
        return 1
    fi
}

check_containers_status() {
    log "Checking container status..."
    ((TOTAL_CHECKS++))
    
    if docker-compose ps &> /dev/null; then
        local running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
        local total_services=$(docker-compose ps --services | wc -l)
        
        if [ "$running_containers" -eq "$total_services" ] && [ "$total_services" -gt 0 ]; then
            success "All containers are running ($running_containers/$total_services)"
        elif [ "$running_containers" -gt 0 ]; then
            warning "Some containers are not running ($running_containers/$total_services)"
        else
            error "No containers are running"
            return 1
        fi
    else
        error "Cannot check container status (docker-compose.yml not found or invalid)"
        return 1
    fi
}

check_service_health() {
    local service_name=$1
    local health_endpoint=$2
    local expected_status=${3:-200}
    
    log "Checking $service_name health..."
    ((TOTAL_CHECKS++))
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$health_endpoint" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        success "$service_name is healthy (HTTP $response)"
    else
        error "$service_name is unhealthy (HTTP $response)"
        return 1
    fi
}

check_database_connectivity() {
    log "Checking database connectivity..."
    ((TOTAL_CHECKS++))
    
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        success "Database is accessible"
    else
        error "Database is not accessible"
        return 1
    fi
}

check_redis_connectivity() {
    log "Checking Redis connectivity..."
    ((TOTAL_CHECKS++))
    
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        success "Redis is accessible"
    else
        error "Redis is not accessible"
        return 1
    fi
}

check_disk_space() {
    log "Checking disk space..."
    ((TOTAL_CHECKS++))
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        success "Disk space is adequate ($disk_usage% used)"
    elif [ "$disk_usage" -lt 90 ]; then
        warning "Disk space is getting low ($disk_usage% used)"
    else
        error "Disk space is critically low ($disk_usage% used)"
        return 1
    fi
}

check_memory_usage() {
    log "Checking memory usage..."
    ((TOTAL_CHECKS++))
    
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -lt 80 ]; then
        success "Memory usage is normal ($memory_usage% used)"
    elif [ "$memory_usage" -lt 90 ]; then
        warning "Memory usage is high ($memory_usage% used)"
    else
        error "Memory usage is critically high ($memory_usage% used)"
        return 1
    fi
}

check_cpu_load() {
    log "Checking CPU load..."
    ((TOTAL_CHECKS++))
    
    local cpu_cores=$(nproc)
    local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local load_percentage=$(echo "$load_average * 100 / $cpu_cores" | bc -l | awk '{printf "%.0f", $1}')
    
    if [ "$load_percentage" -lt 70 ]; then
        success "CPU load is normal ($load_percentage%)"
    elif [ "$load_percentage" -lt 90 ]; then
        warning "CPU load is high ($load_percentage%)"
    else
        error "CPU load is critically high ($load_percentage%)"
        return 1
    fi
}

check_log_files() {
    log "Checking log files..."
    ((TOTAL_CHECKS++))
    
    local log_errors=0
    local log_dirs=("backend/logs" "deployment/monitoring" "/var/log")
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            # Check for recent error logs
            local recent_errors=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL\|CRITICAL" {} \; 2>/dev/null | wc -l)
            if [ "$recent_errors" -gt 0 ]; then
                ((log_errors++))
            fi
        fi
    done
    
    if [ "$log_errors" -eq 0 ]; then
        success "No critical errors in recent logs"
    else
        warning "Found $log_errors log files with recent errors"
    fi
}

check_ssl_certificate() {
    local domain=${1:-localhost}
    
    log "Checking SSL certificate for $domain..."
    ((TOTAL_CHECKS++))
    
    if command -v openssl &> /dev/null; then
        local cert_expiry=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -dates -noout 2>/dev/null | grep "notAfter" | cut -d= -f2)
        
        if [ -n "$cert_expiry" ]; then
            local expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                success "SSL certificate is valid ($days_until_expiry days until expiry)"
            elif [ "$days_until_expiry" -gt 7 ]; then
                warning "SSL certificate expires soon ($days_until_expiry days)"
            else
                error "SSL certificate expires very soon ($days_until_expiry days)"
                return 1
            fi
        else
            warning "Could not verify SSL certificate for $domain"
        fi
    else
        warning "OpenSSL not available for certificate check"
    fi
}

check_backup_status() {
    log "Checking backup status..."
    ((TOTAL_CHECKS++))
    
    local backup_dir="/backups"
    local recent_backup=""
    
    if [ -d "$backup_dir" ]; then
        recent_backup=$(find "$backup_dir" -maxdepth 1 -type d -name "20*" | sort | tail -1)
        
        if [ -n "$recent_backup" ]; then
            local backup_age=$(( ($(date +%s) - $(stat -c %Y "$recent_backup")) / 86400 ))
            
            if [ "$backup_age" -le 1 ]; then
                success "Recent backup found ($(basename "$recent_backup"))"
            elif [ "$backup_age" -le 7 ]; then
                warning "Backup is $backup_age days old"
            else
                error "Backup is too old ($backup_age days)"
                return 1
            fi
        else
            error "No backups found in $backup_dir"
            return 1
        fi
    else
        warning "Backup directory not found"
    fi
}

check_network_connectivity() {
    log "Checking network connectivity..."
    ((TOTAL_CHECKS++))
    
    local test_hosts=("8.8.8.8" "github.com" "docker.io")
    local failed_hosts=0
    
    for host in "${test_hosts[@]}"; do
        if ! ping -c 1 -W 5 "$host" &> /dev/null; then
            ((failed_hosts++))
        fi
    done
    
    if [ "$failed_hosts" -eq 0 ]; then
        success "Network connectivity is good"
    elif [ "$failed_hosts" -lt 3 ]; then
        warning "Some network connectivity issues detected"
    else
        error "Network connectivity is severely impacted"
        return 1
    fi
}

# Generate health report
generate_report() {
    echo | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo "Auto-Grader System Health Report" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo "Generated: $(date)" | tee -a "$LOG_FILE"
    echo "Total Checks: $TOTAL_CHECKS" | tee -a "$LOG_FILE"
    echo "Passed: $PASSED_CHECKS" | tee -a "$LOG_FILE"
    echo "Failed: $FAILED_CHECKS" | tee -a "$LOG_FILE"
    echo "Warnings: $WARNING_CHECKS" | tee -a "$LOG_FILE"
    echo | tee -a "$LOG_FILE"
    
    local overall_status="HEALTHY"
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        overall_status="UNHEALTHY"
    elif [ "$WARNING_CHECKS" -gt 0 ]; then
        overall_status="WARNING"
    fi
    
    echo "Overall Status: $overall_status" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo | tee -a "$LOG_FILE"
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo "❌ System has critical issues that need immediate attention!" | tee -a "$LOG_FILE"
        return 1
    elif [ "$WARNING_CHECKS" -gt 0 ]; then
        echo "⚠️  System has warnings that should be addressed" | tee -a "$LOG_FILE"
        return 2
    else
        echo "✅ System is healthy!" | tee -a "$LOG_FILE"
        return 0
    fi
}

# Send notification if configured
send_notification() {
    local status=$1
    local exit_code=$2
    
    local message="Auto-Grader Health Check $status
Total Checks: $TOTAL_CHECKS
Passed: $PASSED_CHECKS
Failed: $FAILED_CHECKS
Warnings: $WARNING_CHECKS
Time: $(date)"

    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        if [ "$exit_code" -eq 1 ]; then
            color="danger"
        elif [ "$exit_code" -eq 2 ]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\", \"color\":\"${color}\"}" \
            "${SLACK_WEBHOOK_URL}" || true
    fi
    
    # Email notification
    if command -v mail >/dev/null 2>&1 && [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${message}" | mail -s "Auto-Grader Health Check $status" "${NOTIFICATION_EMAIL}" || true
    fi
}

# Main function
main() {
    log "Starting Auto-Grader system health check..."
    echo > "$LOG_FILE"  # Clear log file
    
    # Load environment variables if available
    if [ -f ".env" ]; then
        # shellcheck source=/dev/null
        source .env
    fi
    
    # Run infrastructure checks
    check_docker_status || true
    check_docker_compose_status || true
    check_disk_space || true
    check_memory_usage || true
    check_cpu_load || true
    check_network_connectivity || true
    
    # Run application checks (if services are running)
    if docker-compose ps &> /dev/null; then
        check_containers_status || true
        check_database_connectivity || true
        check_redis_connectivity || true
        
        # Check service health endpoints
        check_service_health "Frontend" "http://localhost:80/health" || true
        check_service_health "Backend API" "http://localhost:5000/api/health" || true
        check_service_health "ML Service" "http://localhost:5001/health" || true
    fi
    
    # Additional checks
    check_log_files || true
    check_backup_status || true
    
    # SSL check (if domain is provided)
    if [ -n "${DOMAIN_NAME:-}" ]; then
        check_ssl_certificate "$DOMAIN_NAME" || true
    fi
    
    # Generate report
    local exit_code=0
    generate_report || exit_code=$?
    
    # Send notification
    local status_text="COMPLETED"
    if [ "$exit_code" -eq 1 ]; then
        status_text="FAILED"
    elif [ "$exit_code" -eq 2 ]; then
        status_text="WARNING"
    fi
    
    send_notification "$status_text" "$exit_code"
    
    exit $exit_code
}

# Handle script interruption
trap 'error "Health check interrupted"; exit 1' INT TERM

# Run main function
main "$@"
