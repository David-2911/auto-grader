#!/bin/bash

# Auto-Grader Disaster Recovery Script
# This script handles the restoration of the Auto-Grader system from backups

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/backups"
RESTORE_DIR="/tmp/restore"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "/tmp/restore.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "/tmp/restore.log" >&2
}

# Display usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_TIMESTAMP

Restore Auto-Grader system from backup

OPTIONS:
    -h, --help              Show this help message
    -b, --backup-dir DIR    Backup directory (default: ${BACKUP_DIR})
    -f, --full              Perform full restoration (database + files + config)
    -d, --database-only     Restore database only
    -F, --files-only        Restore files only
    -c, --config-only       Restore configuration only
    --dry-run              Show what would be restored without making changes
    --force                Force restoration without confirmation
    --from-cloud           Download backup from cloud storage first

EXAMPLES:
    $0 20231201_143000                    # Interactive restoration
    $0 -f 20231201_143000                # Full restoration
    $0 -d 20231201_143000                # Database only
    $0 --from-cloud 20231201_143000      # Restore from cloud backup

EOF
}

# Parse command line arguments
parse_args() {
    RESTORE_TYPE="interactive"
    DRY_RUN=false
    FORCE=false
    FROM_CLOUD=false
    BACKUP_TIMESTAMP=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -b|--backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -f|--full)
                RESTORE_TYPE="full"
                shift
                ;;
            -d|--database-only)
                RESTORE_TYPE="database"
                shift
                ;;
            -F|--files-only)
                RESTORE_TYPE="files"
                shift
                ;;
            -c|--config-only)
                RESTORE_TYPE="config"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --from-cloud)
                FROM_CLOUD=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [ -z "$BACKUP_TIMESTAMP" ]; then
                    BACKUP_TIMESTAMP="$1"
                else
                    error "Multiple backup timestamps specified"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        error "Backup timestamp is required"
        usage
        exit 1
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    
    # Local backups
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" | sort | while read -r backup; do
            local timestamp=$(basename "$backup")
            local size=$(du -sh "$backup" 2>/dev/null | cut -f1 || echo "Unknown")
            echo "  Local:  $timestamp ($size)"
        done
    fi
    
    # Cloud backups (if configured)
    if [ -n "${AWS_S3_BUCKET:-}" ]; then
        echo "  Cloud backups (S3):"
        aws s3 ls "s3://${AWS_S3_BUCKET}/backups/" | grep "PRE" | awk '{print "    " $2}' | sed 's|/$||'
    fi
}

# Download backup from cloud
download_from_cloud() {
    local timestamp="$1"
    local local_backup_path="${BACKUP_DIR}/${timestamp}"
    
    if [ -d "$local_backup_path" ]; then
        log "Backup already exists locally: $local_backup_path"
        return 0
    fi
    
    log "Downloading backup from cloud: $timestamp"
    
    mkdir -p "$local_backup_path"
    
    if [ -n "${AWS_S3_BUCKET:-}" ]; then
        log "Downloading from S3..."
        aws s3 sync "s3://${AWS_S3_BUCKET}/backups/${timestamp}/" "$local_backup_path/" || {
            error "Failed to download backup from S3"
            return 1
        }
    elif [ -n "${AZURE_STORAGE_ACCOUNT:-}" ]; then
        log "Downloading from Azure..."
        az storage blob download-batch \
            --source "${AZURE_CONTAINER}" \
            --destination "$local_backup_path" \
            --account-name "${AZURE_STORAGE_ACCOUNT}" \
            --pattern "${timestamp}/*" || {
            error "Failed to download backup from Azure"
            return 1
        }
    else
        error "No cloud storage configuration found"
        return 1
    fi
    
    log "Cloud backup download completed"
}

# Verify backup exists and is valid
verify_backup() {
    local timestamp="$1"
    local backup_path="${BACKUP_DIR}/${timestamp}"
    
    if [ ! -d "$backup_path" ]; then
        error "Backup not found: $backup_path"
        return 1
    fi
    
    log "Verifying backup: $timestamp"
    
    # Check expected structure
    local expected_dirs=("database" "files" "config" "logs")
    for dir in "${expected_dirs[@]}"; do
        if [ ! -d "${backup_path}/${dir}" ]; then
            error "Missing backup directory: ${dir}"
            return 1
        fi
    done
    
    # Verify compressed files integrity
    find "$backup_path" -name "*.gz" -exec gunzip -t {} \; || {
        error "Backup file integrity check failed"
        return 1
    }
    
    log "Backup verification completed successfully"
    return 0
}

# Stop services
stop_services() {
    log "Stopping Auto-Grader services..."
    
    if $DRY_RUN; then
        log "[DRY RUN] Would stop Docker Compose services"
        return 0
    fi
    
    docker-compose down || {
        error "Failed to stop services"
        return 1
    }
    
    log "Services stopped successfully"
}

# Start services
start_services() {
    log "Starting Auto-Grader services..."
    
    if $DRY_RUN; then
        log "[DRY RUN] Would start Docker Compose services"
        return 0
    fi
    
    docker-compose up -d || {
        error "Failed to start services"
        return 1
    }
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    local timeout=300
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose ps | grep -q "unhealthy"; then
            sleep 10
            elapsed=$((elapsed + 10))
        else
            break
        fi
    done
    
    if [ $elapsed -ge $timeout ]; then
        error "Services failed to become healthy within timeout"
        return 1
    fi
    
    log "Services started successfully"
}

# Restore database
restore_database() {
    local backup_path="$1"
    local db_backup_path="${backup_path}/database"
    
    log "Restoring database..."
    
    if $DRY_RUN; then
        log "[DRY RUN] Would restore database from: $db_backup_path"
        return 0
    fi
    
    # Restore MySQL
    local mysql_backup="${db_backup_path}/mysql_${BACKUP_TIMESTAMP}.sql.gz"
    if [ -f "$mysql_backup" ]; then
        log "Restoring MySQL database..."
        
        # Start only MySQL service for restoration
        docker-compose up -d mysql
        
        # Wait for MySQL to be ready
        timeout 60 bash -c 'until docker exec autograder-mysql mysqladmin ping -h localhost --silent; do sleep 1; done'
        
        # Restore database
        gunzip -c "$mysql_backup" | docker exec -i autograder-mysql mysql -u root -p"${DB_ROOT_PASSWORD}" || {
            error "Failed to restore MySQL database"
            return 1
        }
        
        log "MySQL database restored successfully"
    fi
    
    # Restore Redis (if backup exists)
    local redis_backup="${db_backup_path}/redis_${BACKUP_TIMESTAMP}.rdb"
    if [ -f "$redis_backup" ]; then
        log "Restoring Redis data..."
        
        # Copy Redis backup to volume
        docker run --rm \
            -v "autograder_redis_data:/data" \
            -v "${redis_backup}:/backup.rdb:ro" \
            alpine:latest \
            cp /backup.rdb /data/dump.rdb
        
        log "Redis data restored successfully"
    fi
}

# Restore files
restore_files() {
    local backup_path="$1"
    local files_backup_path="${backup_path}/files"
    
    log "Restoring files..."
    
    if $DRY_RUN; then
        log "[DRY RUN] Would restore files from: $files_backup_path"
        return 0
    fi
    
    # Restore storage volumes
    local storage_volumes=(
        "backend_storage"
        "ml_models"
        "ml_notebooks"
    )
    
    for volume in "${storage_volumes[@]}"; do
        local volume_backup="${files_backup_path}/${volume}_${BACKUP_TIMESTAMP}.tar.gz"
        if [ -f "$volume_backup" ]; then
            log "Restoring volume: $volume"
            
            # Remove existing volume data and restore
            docker volume rm "autograder_${volume}" 2>/dev/null || true
            docker volume create "autograder_${volume}"
            
            docker run --rm \
                -v "autograder_${volume}:/target" \
                -v "${volume_backup}:/backup.tar.gz:ro" \
                alpine:latest \
                sh -c "cd /target && tar xzf /backup.tar.gz"
                
            log "Volume $volume restored successfully"
        fi
    done
}

# Restore configuration
restore_configuration() {
    local backup_path="$1"
    local config_backup_path="${backup_path}/config"
    
    log "Restoring configuration..."
    
    if $DRY_RUN; then
        log "[DRY RUN] Would restore configuration from: $config_backup_path"
        return 0
    fi
    
    # Restore environment file
    local env_backup="${config_backup_path}/env_${BACKUP_TIMESTAMP}"
    if [ -f "$env_backup" ]; then
        cp "$env_backup" .env
        log "Environment configuration restored"
    fi
    
    # Restore deployment configuration
    local deployment_backup="${config_backup_path}/deployment_${BACKUP_TIMESTAMP}.tar.gz"
    if [ -f "$deployment_backup" ]; then
        tar xzf "$deployment_backup"
        log "Deployment configuration restored"
    fi
    
    # Restore SSL certificates
    local ssl_backup="${config_backup_path}/ssl_${BACKUP_TIMESTAMP}.tar.gz"
    if [ -f "$ssl_backup" ]; then
        sudo mkdir -p /etc/ssl/autograder
        sudo tar xzf "$ssl_backup" -C /
        log "SSL certificates restored"
    fi
}

# Confirmation prompt
confirm_restore() {
    if $FORCE; then
        return 0
    fi
    
    echo
    echo "WARNING: This will restore the Auto-Grader system from backup."
    echo "Backup timestamp: $BACKUP_TIMESTAMP"
    echo "Restore type: $RESTORE_TYPE"
    echo
    echo "This operation will:"
    case $RESTORE_TYPE in
        full|interactive)
            echo "  - Stop all services"
            echo "  - Restore database (ALL DATA WILL BE REPLACED)"
            echo "  - Restore file storage"
            echo "  - Restore configuration"
            echo "  - Restart services"
            ;;
        database)
            echo "  - Stop services"
            echo "  - Restore database only (ALL DATA WILL BE REPLACED)"
            echo "  - Restart services"
            ;;
        files)
            echo "  - Stop services"
            echo "  - Restore file storage only"
            echo "  - Restart services"
            ;;
        config)
            echo "  - Restore configuration files only"
            ;;
    esac
    echo
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restoration cancelled by user"
        exit 0
    fi
}

# Interactive restoration menu
interactive_restore() {
    echo
    echo "Auto-Grader Restoration Menu"
    echo "Backup timestamp: $BACKUP_TIMESTAMP"
    echo
    echo "Select restoration options:"
    echo "1) Full restoration (database + files + configuration)"
    echo "2) Database only"
    echo "3) Files only"
    echo "4) Configuration only"
    echo "5) Custom selection"
    echo "6) Cancel"
    echo
    read -p "Enter your choice (1-6): " -r choice
    
    case $choice in
        1) RESTORE_TYPE="full" ;;
        2) RESTORE_TYPE="database" ;;
        3) RESTORE_TYPE="files" ;;
        4) RESTORE_TYPE="config" ;;
        5) 
            echo "Custom restoration options:"
            read -p "Restore database? (y/N): " -r restore_db
            read -p "Restore files? (y/N): " -r restore_files_opt
            read -p "Restore configuration? (y/N): " -r restore_config_opt
            RESTORE_TYPE="custom"
            ;;
        6) 
            log "Restoration cancelled"
            exit 0
            ;;
        *)
            error "Invalid choice"
            exit 1
            ;;
    esac
}

# Perform restoration
perform_restore() {
    local backup_path="${BACKUP_DIR}/${BACKUP_TIMESTAMP}"
    
    log "Starting restoration process..."
    
    case $RESTORE_TYPE in
        full)
            stop_services
            restore_database "$backup_path"
            restore_files "$backup_path"
            restore_configuration "$backup_path"
            start_services
            ;;
        database)
            stop_services
            restore_database "$backup_path"
            start_services
            ;;
        files)
            stop_services
            restore_files "$backup_path"
            start_services
            ;;
        config)
            restore_configuration "$backup_path"
            ;;
        interactive)
            interactive_restore
            confirm_restore
            perform_restore  # Recursive call with selected type
            return
            ;;
        custom)
            stop_services
            [[ $restore_db =~ ^[Yy]$ ]] && restore_database "$backup_path"
            [[ $restore_files_opt =~ ^[Yy]$ ]] && restore_files "$backup_path"
            [[ $restore_config_opt =~ ^[Yy]$ ]] && restore_configuration "$backup_path"
            start_services
            ;;
    esac
    
    log "Restoration completed successfully"
}

# Send notification
send_notification() {
    local status="$1"
    local message="Auto-Grader Restoration ${status}
Timestamp: ${BACKUP_TIMESTAMP}
Restore Type: ${RESTORE_TYPE}
Date: $(date)"

    # Slack notification (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            "${SLACK_WEBHOOK_URL}" || true
    fi
    
    # Email notification (if configured)
    if command -v mail >/dev/null 2>&1 && [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${message}" | mail -s "Auto-Grader Restoration ${status}" "${NOTIFICATION_EMAIL}" || true
    fi
}

# Main function
main() {
    parse_args "$@"
    
    # Load environment variables if available
    if [ -f ".env" ]; then
        # shellcheck source=/dev/null
        source .env
    fi
    
    log "Starting Auto-Grader restoration process..."
    log "Backup timestamp: $BACKUP_TIMESTAMP"
    log "Restore type: $RESTORE_TYPE"
    
    # Download from cloud if requested
    if $FROM_CLOUD; then
        download_from_cloud "$BACKUP_TIMESTAMP" || {
            error "Failed to download backup from cloud"
            exit 1
        }
    fi
    
    # Verify backup exists and is valid
    verify_backup "$BACKUP_TIMESTAMP" || {
        error "Backup verification failed"
        list_backups
        exit 1
    }
    
    # Confirm restoration (unless forced)
    confirm_restore
    
    # Perform restoration
    if perform_restore; then
        log "Restoration completed successfully"
        send_notification "SUCCESS"
        exit 0
    else
        error "Restoration failed"
        send_notification "FAILED"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Restoration interrupted"; exit 1' INT TERM

# Run main function
main "$@"
