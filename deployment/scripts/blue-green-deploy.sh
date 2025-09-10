#!/bin/bash

# Auto-Grader Blue-Green Deployment Script
# This script implements zero-downtime blue-green deployment strategy

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-west-2}
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*${NC}"
}

# Exit on error
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code $exit_code"
        # Rollback logic would go here
    fi
    exit $exit_code
}

trap cleanup EXIT

# Validate environment
validate_environment() {
    log "Validating environment: $ENVIRONMENT"
    
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi
    
    # Check required AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is required but not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Get ECS cluster and service information
get_ecs_info() {
    CLUSTER_NAME="autograder-${ENVIRONMENT}"
    FRONTEND_SERVICE="autograder-${ENVIRONMENT}-frontend"
    BACKEND_SERVICE="autograder-${ENVIRONMENT}-backend"
    ML_SERVICE="autograder-${ENVIRONMENT}-ml"
    
    log "ECS Cluster: $CLUSTER_NAME"
    log "Services: $FRONTEND_SERVICE, $BACKEND_SERVICE, $ML_SERVICE"
}

# Get current task definition
get_current_task_definition() {
    local service_name=$1
    
    log "Getting current task definition for $service_name"
    
    local task_def_arn=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ "$task_def_arn" == "None" ] || [ -z "$task_def_arn" ]; then
        error "Failed to get task definition for $service_name"
        exit 1
    fi
    
    echo "$task_def_arn"
}

# Create new task definition with updated image
create_new_task_definition() {
    local service_name=$1
    local new_image=$2
    local current_task_def_arn=$3
    
    log "Creating new task definition for $service_name with image $new_image"
    
    # Get current task definition
    local task_def_json=$(aws ecs describe-task-definition \
        --task-definition "$current_task_def_arn" \
        --query 'taskDefinition')
    
    # Update image in task definition
    local new_task_def=$(echo "$task_def_json" | jq \
        --arg new_image "$new_image" \
        'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy) |
        .containerDefinitions[0].image = $new_image')
    
    # Register new task definition
    local new_task_def_arn=$(echo "$new_task_def" | aws ecs register-task-definition \
        --cli-input-json file:///dev/stdin \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    if [ -z "$new_task_def_arn" ]; then
        error "Failed to register new task definition"
        exit 1
    fi
    
    success "New task definition created: $new_task_def_arn"
    echo "$new_task_def_arn"
}

# Update service with new task definition
update_service() {
    local service_name=$1
    local new_task_def_arn=$2
    
    log "Updating service $service_name with new task definition"
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --task-definition "$new_task_def_arn" \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
        > /dev/null
    
    success "Service update initiated for $service_name"
}

# Wait for deployment to complete
wait_for_deployment() {
    local service_name=$1
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=$HEALTH_CHECK_INTERVAL
    local elapsed=0
    
    log "Waiting for deployment to complete for $service_name (timeout: ${timeout}s)"
    
    while [ $elapsed -lt $timeout ]; do
        local deployment_status=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --query 'services[0].deployments[?status==`PRIMARY`].rolloutState' \
            --output text)
        
        if [ "$deployment_status" == "COMPLETED" ]; then
            success "Deployment completed for $service_name"
            return 0
        elif [ "$deployment_status" == "FAILED" ]; then
            error "Deployment failed for $service_name"
            return 1
        fi
        
        log "Deployment status: $deployment_status (elapsed: ${elapsed}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    error "Deployment timeout for $service_name"
    return 1
}

# Health check function
health_check() {
    local service_name=$1
    local health_endpoint=$2
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=10
    local elapsed=0
    
    log "Performing health check for $service_name at $health_endpoint"
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "$health_endpoint" > /dev/null; then
            success "Health check passed for $service_name"
            return 0
        fi
        
        log "Health check in progress... (elapsed: ${elapsed}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    error "Health check failed for $service_name"
    return 1
}

# Get load balancer DNS
get_load_balancer_dns() {
    local lb_name="autograder-${ENVIRONMENT}-alb"
    
    aws elbv2 describe-load-balancers \
        --names "$lb_name" \
        --query 'LoadBalancers[0].DNSName' \
        --output text
}

# Rollback deployment
rollback_deployment() {
    local service_name=$1
    local previous_task_def_arn=$2
    
    warning "Rolling back deployment for $service_name"
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --task-definition "$previous_task_def_arn" \
        > /dev/null
    
    wait_for_deployment "$service_name"
    warning "Rollback completed for $service_name"
}

# Deploy single service
deploy_service() {
    local service_name=$1
    local image_name=$2
    local health_endpoint=$3
    
    log "Starting deployment for $service_name"
    
    # Get current task definition
    local current_task_def_arn=$(get_current_task_definition "$service_name")
    
    # Get new image tag
    local new_image="ghcr.io/david-2911/auto-grader-${image_name}:${GITHUB_SHA:-latest}"
    
    # Create new task definition
    local new_task_def_arn=$(create_new_task_definition "$service_name" "$new_image" "$current_task_def_arn")
    
    # Update service
    update_service "$service_name" "$new_task_def_arn"
    
    # Wait for deployment
    if wait_for_deployment "$service_name"; then
        # Perform health check
        if health_check "$service_name" "$health_endpoint"; then
            success "Deployment successful for $service_name"
            return 0
        else
            error "Health check failed for $service_name"
            rollback_deployment "$service_name" "$current_task_def_arn"
            return 1
        fi
    else
        error "Deployment failed for $service_name"
        rollback_deployment "$service_name" "$current_task_def_arn"
        return 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks"
    
    # Check if cluster exists
    if ! aws ecs describe-clusters --clusters "$CLUSTER_NAME" --query 'clusters[0].status' --output text | grep -q ACTIVE; then
        error "ECS cluster $CLUSTER_NAME is not active"
        exit 1
    fi
    
    # Check if services exist
    local services=("$FRONTEND_SERVICE" "$BACKEND_SERVICE" "$ML_SERVICE")
    for service in "${services[@]}"; do
        if ! aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$service" --query 'services[0].status' --output text | grep -q ACTIVE; then
            error "ECS service $service is not active"
            exit 1
        fi
    done
    
    success "Pre-deployment checks passed"
}

# Post-deployment verification
post_deployment_verification() {
    local lb_dns=$(get_load_balancer_dns)
    
    log "Running post-deployment verification"
    
    # Test endpoints
    local endpoints=(
        "https://${lb_dns}/health"
        "https://${lb_dns}/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! health_check "endpoint" "$endpoint"; then
            error "Post-deployment verification failed for $endpoint"
            return 1
        fi
    done
    
    success "Post-deployment verification passed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local services=$2
    
    local message="🚀 Auto-Grader Deployment ${status}
Environment: ${ENVIRONMENT}
Services: ${services}
Commit: ${GITHUB_SHA:-N/A}
Time: $(date)
Deployer: ${GITHUB_ACTOR:-$(whoami)}"

    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        if [ "$status" != "SUCCESS" ]; then
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\", \"color\":\"${color}\"}" \
            "${SLACK_WEBHOOK_URL}" || true
    fi
    
    # Email notification (if configured)
    if command -v mail >/dev/null 2>&1 && [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${message}" | mail -s "Auto-Grader Deployment ${status}" "${NOTIFICATION_EMAIL}" || true
    fi
}

# Main deployment function
main() {
    log "Starting Auto-Grader Blue-Green Deployment"
    log "Environment: $ENVIRONMENT"
    log "AWS Region: $AWS_REGION"
    
    # Validate environment
    validate_environment
    
    # Get ECS information
    get_ecs_info
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Get load balancer DNS for health checks
    local lb_dns=$(get_load_balancer_dns)
    
    # Deploy services in order (backend first, then frontend, then ML)
    local deployed_services=()
    local failed_services=()
    
    # Deploy backend
    if deploy_service "$BACKEND_SERVICE" "backend" "https://${lb_dns}/api/health"; then
        deployed_services+=("backend")
    else
        failed_services+=("backend")
    fi
    
    # Deploy frontend (only if backend succeeded)
    if [ ${#failed_services[@]} -eq 0 ]; then
        if deploy_service "$FRONTEND_SERVICE" "frontend" "https://${lb_dns}/health"; then
            deployed_services+=("frontend")
        else
            failed_services+=("frontend")
        fi
    fi
    
    # Deploy ML service (only if others succeeded)
    if [ ${#failed_services[@]} -eq 0 ]; then
        if deploy_service "$ML_SERVICE" "ml" "https://${lb_dns}/api/ml/health"; then
            deployed_services+=("ml")
        else
            failed_services+=("ml")
        fi
    fi
    
    # Post-deployment verification
    if [ ${#failed_services[@]} -eq 0 ]; then
        if post_deployment_verification; then
            success "Blue-Green deployment completed successfully"
            send_notification "SUCCESS" "$(IFS=,; echo "${deployed_services[*]}")"
            exit 0
        else
            error "Post-deployment verification failed"
            send_notification "FAILED (Verification)" "$(IFS=,; echo "${deployed_services[*]}")"
            exit 1
        fi
    else
        error "Deployment failed for services: $(IFS=,; echo "${failed_services[*]}")"
        send_notification "FAILED" "$(IFS=,; echo "${failed_services[*]}")"
        exit 1
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment>"
    echo "Environment: staging or production"
    exit 1
fi

# Run main function
main "$@"
