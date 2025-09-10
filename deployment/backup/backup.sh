#!/bin/bash

# Auto-Grader Backup Script
# This script performs comprehensive backups of the Auto-Grader system

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${BACKUP_DIR}/backup.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${BACKUP_DIR}/backup.log" >&2
}

# Create backup directory structure
create_backup_structure() {
    local backup_path="${BACKUP_DIR}/${TIMESTAMP}"
    mkdir -p "${backup_path}"/{database,files,config,logs}
    echo "${backup_path}"
}

# Database backup
backup_database() {
    local backup_path="$1"
    local db_backup_path="${backup_path}/database"
    
    log "Starting database backup..."
    
    # MySQL backup
    if [ -n "${DB_HOST:-}" ]; then
        log "Backing up MySQL database..."
        docker exec autograder-mysql mysqldump \
            --single-transaction \
            --routines \
            --triggers \
            --all-databases \
            -u root -p"${DB_ROOT_PASSWORD}" \
            | gzip > "${db_backup_path}/mysql_${TIMESTAMP}.sql.gz"
        
        # Verify backup
        if [ -f "${db_backup_path}/mysql_${TIMESTAMP}.sql.gz" ]; then
            log "MySQL backup completed successfully"
            # Test backup integrity
            gunzip -t "${db_backup_path}/mysql_${TIMESTAMP}.sql.gz" && \
                log "MySQL backup integrity verified" || \
                error "MySQL backup integrity check failed"
        else
            error "MySQL backup failed"
            return 1
        fi
    fi
    
    # Redis backup
    if [ -n "${REDIS_HOST:-}" ]; then
        log "Backing up Redis data..."
        docker exec autograder-redis redis-cli \
            --rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
        
        if [ -f "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb" ]; then
            mv "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb" "${db_backup_path}/"
            log "Redis backup completed successfully"
        else
            error "Redis backup failed"
            return 1
        fi
    fi
}

# File system backup
backup_files() {
    local backup_path="$1"
    local files_backup_path="${backup_path}/files"
    
    log "Starting file system backup..."
    
    # Backup storage directories
    local storage_dirs=(
        "backend_storage"
        "ml_models"
        "ml_notebooks"
    )
    
    for dir in "${storage_dirs[@]}"; do
        if docker volume inspect "autograder_${dir}" >/dev/null 2>&1; then
            log "Backing up volume: ${dir}"
            docker run --rm \
                -v "autograder_${dir}:/source:ro" \
                -v "${files_backup_path}:/backup" \
                alpine:latest \
                tar czf "/backup/${dir}_${TIMESTAMP}.tar.gz" -C /source .
        fi
    done
    
    log "File system backup completed"
}

# Configuration backup
backup_configuration() {
    local backup_path="$1"
    local config_backup_path="${backup_path}/config"
    
    log "Starting configuration backup..."
    
    # Copy environment files
    if [ -f ".env" ]; then
        cp .env "${config_backup_path}/env_${TIMESTAMP}"
    fi
    
    # Copy Docker Compose files
    cp docker-compose*.yml "${config_backup_path}/" 2>/dev/null || true
    
    # Copy deployment configurations
    if [ -d "deployment" ]; then
        tar czf "${config_backup_path}/deployment_${TIMESTAMP}.tar.gz" deployment/
    fi
    
    # Copy SSL certificates (if any)
    if [ -d "/etc/ssl/autograder" ]; then
        tar czf "${config_backup_path}/ssl_${TIMESTAMP}.tar.gz" /etc/ssl/autograder/
    fi
    
    log "Configuration backup completed"
}

# Logs backup
backup_logs() {
    local backup_path="$1"
    local logs_backup_path="${backup_path}/logs"
    
    log "Starting logs backup..."
    
    # Backup application logs
    if docker volume inspect "autograder_backend_logs" >/dev/null 2>&1; then
        docker run --rm \
            -v "autograder_backend_logs:/source:ro" \
            -v "${logs_backup_path}:/backup" \
            alpine:latest \
            tar czf "/backup/backend_logs_${TIMESTAMP}.tar.gz" -C /source .
    fi
    
    # Backup nginx logs
    if docker volume inspect "autograder_nginx_logs" >/dev/null 2>&1; then
        docker run --rm \
            -v "autograder_nginx_logs:/source:ro" \
            -v "${logs_backup_path}:/backup" \
            alpine:latest \
            tar czf "/backup/nginx_logs_${TIMESTAMP}.tar.gz" -C /source .
    fi
    
    log "Logs backup completed"
}

# Upload to cloud storage (if configured)
upload_to_cloud() {
    local backup_path="$1"
    
    if [ -n "${AWS_S3_BUCKET:-}" ]; then
        log "Uploading backup to S3..."
        aws s3 sync "${backup_path}" "s3://${AWS_S3_BUCKET}/backups/$(basename "${backup_path}")/" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256
        log "S3 upload completed"
    fi
    
    if [ -n "${AZURE_STORAGE_ACCOUNT:-}" ]; then
        log "Uploading backup to Azure..."
        az storage blob upload-batch \
            --destination "${AZURE_CONTAINER}" \
            --source "${backup_path}" \
            --account-name "${AZURE_STORAGE_ACCOUNT}"
        log "Azure upload completed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Local cleanup
    find "${BACKUP_DIR}" -type d -name "20*" -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [ -n "${AWS_S3_BUCKET:-}" ]; then
        aws s3 ls "s3://${AWS_S3_BUCKET}/backups/" | \
            awk '{print $2}' | \
            while read -r backup_name; do
                # Extract date from backup name and delete if older than retention period
                backup_date=$(echo "${backup_name}" | grep -oE '[0-9]{8}' | head -1)
                if [ -n "${backup_date}" ]; then
                    days_old=$(( ($(date +%s) - $(date -d "${backup_date}" +%s)) / 86400 ))
                    if [ ${days_old} -gt ${RETENTION_DAYS} ]; then
                        aws s3 rm --recursive "s3://${AWS_S3_BUCKET}/backups/${backup_name}"
                        log "Deleted old S3 backup: ${backup_name}"
                    fi
                fi
            done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"
    
    log "Verifying backup integrity..."
    
    # Check if all expected files exist
    local expected_files=(
        "database/mysql_${TIMESTAMP}.sql.gz"
        "files"
        "config"
        "logs"
    )
    
    for file in "${expected_files[@]}"; do
        if [ ! -e "${backup_path}/${file}" ]; then
            error "Missing backup file: ${file}"
            return 1
        fi
    done
    
    # Verify compressed files
    find "${backup_path}" -name "*.gz" -exec gunzip -t {} \; || {
        error "Backup integrity check failed"
        return 1
    }
    
    find "${backup_path}" -name "*.tar.gz" -exec tar -tzf {} >/dev/null \; || {
        error "Backup archive integrity check failed"
        return 1
    }
    
    log "Backup integrity verification completed successfully"
}

# Send notification
send_notification() {
    local status="$1"
    local backup_path="$2"
    local backup_size=""
    
    if [ -d "${backup_path}" ]; then
        backup_size=$(du -sh "${backup_path}" | cut -f1)
    fi
    
    local message="Auto-Grader Backup ${status}
Timestamp: ${TIMESTAMP}
Backup Size: ${backup_size}
Backup Path: ${backup_path}"

    # Slack notification (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            "${SLACK_WEBHOOK_URL}" || true
    fi
    
    # Email notification (if configured)
    if command -v mail >/dev/null 2>&1 && [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${message}" | mail -s "Auto-Grader Backup ${status}" "${NOTIFICATION_EMAIL}" || true
    fi
}

# Main backup function
main() {
    log "Starting Auto-Grader backup process..."
    
    # Ensure backup directory exists
    mkdir -p "${BACKUP_DIR}"
    
    # Create backup structure
    local backup_path
    backup_path=$(create_backup_structure)
    
    # Perform backups
    if backup_database "${backup_path}" && \
       backup_files "${backup_path}" && \
       backup_configuration "${backup_path}" && \
       backup_logs "${backup_path}"; then
        
        # Verify backup
        if verify_backup "${backup_path}"; then
            log "Backup completed successfully"
            
            # Upload to cloud
            upload_to_cloud "${backup_path}"
            
            # Cleanup old backups
            cleanup_old_backups
            
            # Send success notification
            send_notification "SUCCESS" "${backup_path}"
            
            exit 0
        else
            error "Backup verification failed"
            send_notification "FAILED (Verification)" "${backup_path}"
            exit 1
        fi
    else
        error "Backup process failed"
        send_notification "FAILED" "${backup_path}"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Backup interrupted"; exit 1' INT TERM

# Load environment variables if available
if [ -f ".env" ]; then
    # shellcheck source=/dev/null
    source .env
fi

# Run main function
main "$@"
