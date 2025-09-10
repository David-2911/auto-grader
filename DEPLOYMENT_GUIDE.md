# Auto-Grader System Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Application Deployment](#application-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Security Configuration](#security-configuration)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Overview

The Auto-Grader system is a comprehensive educational platform that uses OCR technology and machine learning to automate the grading process. This deployment guide covers the complete setup for production and staging environments.

### Architecture Components
- **Frontend**: React application with Vite build system
- **Backend**: Node.js/Express API server with JWT authentication
- **Database**: MySQL 8.0 for data persistence
- **Cache**: Redis for session management and caching
- **ML Service**: Python-based machine learning service with Jupyter notebooks
- **File Processor**: Celery-based file processing service
- **Monitoring**: Prometheus, Grafana, and custom health checks
- **Load Balancer**: Nginx with SSL termination

### Deployment Strategy
- **Containerization**: Docker containers for consistent deployment
- **Orchestration**: Docker Compose for multi-container management
- **Infrastructure**: Terraform for cloud resource provisioning
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Scaling**: Auto-scaling groups with health checks
- **Monitoring**: Comprehensive logging and metrics collection

## Prerequisites

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Terraform 1.0+
- AWS CLI 2.0+
- Node.js 18+
- Python 3.9+

### Access Requirements
- AWS account with appropriate IAM permissions
- Domain name for the application
- SSL certificate (Let's Encrypt or purchased)
- GitHub repository access for CI/CD

### Hardware Requirements

#### Staging Environment
- **Application Servers**: 2x t3.large (2 vCPU, 8GB RAM)
- **Database**: db.t3.large (2 vCPU, 8GB RAM)
- **Load Balancer**: Application Load Balancer
- **Storage**: 100GB SSD for database, 50GB for file storage

#### Production Environment
- **Application Servers**: 3x t3.xlarge (4 vCPU, 16GB RAM)
- **Database**: db.t3.xlarge (4 vCPU, 16GB RAM) with Multi-AZ
- **Load Balancer**: Application Load Balancer with WAF
- **Storage**: 500GB SSD for database, 200GB for file storage

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/David-2911/auto-grader.git
cd auto-grader
```

### 2. Configure Environment Variables

#### Staging Environment
```bash
cp deployment/env/.env.staging.template .env.staging
# Edit .env.staging with your configuration
```

#### Production Environment
```bash
cp deployment/env/.env.production.template .env.production
# Edit .env.production with your configuration
```

### 3. Generate SSH Keys for EC2 Access
```bash
mkdir -p deployment/terraform/keys
ssh-keygen -t rsa -b 4096 -f deployment/terraform/keys/app_key
```

### 4. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region
```

## Infrastructure Deployment

### 1. Initialize Terraform
```bash
cd deployment/terraform
terraform init
```

### 2. Plan Infrastructure (Staging)
```bash
terraform workspace new staging
terraform plan -var-file="staging.tfvars" -out=staging.plan
```

### 3. Deploy Infrastructure (Staging)
```bash
terraform apply staging.plan
```

### 4. Deploy Infrastructure (Production)
```bash
terraform workspace new production
terraform plan -var-file="production.tfvars" -out=production.plan
terraform apply production.plan
```

### 5. Configure DNS
After infrastructure deployment, update your DNS settings to point to the Application Load Balancer DNS name.

## Application Deployment

### Local Development Setup

#### 1. Start Development Environment
```bash
# Copy development environment file
cp deployment/env/.env.staging.template .env

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

#### 2. Initialize Database
```bash
# Wait for MySQL to be ready
docker-compose -f docker-compose.dev.yml exec mysql mysqladmin ping -h localhost --silent

# Run database migrations
docker-compose -f docker-compose.dev.yml exec backend npm run migrate
```

#### 3. Access Services
- Frontend: http://localhost:3001
- Backend API: http://localhost:5001
- ML Service: http://localhost:8888 (Jupyter)
- Grafana: http://localhost:3000
- Mailhog: http://localhost:8025

### Production Deployment

#### 1. Build and Push Images
```bash
# Set environment variables
export ENVIRONMENT=production
export AWS_REGION=us-west-2

# Build images
docker build -f Dockerfile.backend -t autograder-backend:latest .
docker build -f Dockerfile.frontend -t autograder-frontend:latest .
docker build -f Dockerfile.ml -t autograder-ml:latest .

# Tag and push to registry
docker tag autograder-backend:latest ghcr.io/david-2911/auto-grader-backend:latest
docker tag autograder-frontend:latest ghcr.io/david-2911/auto-grader-frontend:latest
docker tag autograder-ml:latest ghcr.io/david-2911/auto-grader-ml:latest

docker push ghcr.io/david-2911/auto-grader-backend:latest
docker push ghcr.io/david-2911/auto-grader-frontend:latest
docker push ghcr.io/david-2911/auto-grader-ml:latest
```

#### 2. Deploy with Blue-Green Strategy
```bash
# Deploy to staging first
./deployment/scripts/blue-green-deploy.sh staging

# After testing, deploy to production
./deployment/scripts/blue-green-deploy.sh production
```

#### 3. Verify Deployment
```bash
# Check service health
curl -f https://your-domain.com/health
curl -f https://your-domain.com/api/health

# Run full health check
docker run --rm autograder-backend:latest node src/utils/healthcheck.js
```

## Monitoring Setup

### 1. Configure Prometheus
Prometheus is automatically deployed with the application stack. Access it at:
- Staging: http://staging-domain.com:9090
- Production: http://production-domain.com:9090

### 2. Configure Grafana
1. Access Grafana at http://your-domain.com:3000
2. Login with admin credentials (set in environment variables)
3. Import pre-configured dashboards from `deployment/monitoring/grafana/dashboards/`

### 3. Set Up Alerting
1. Configure Alertmanager for notifications
2. Set up Slack/email integration
3. Test alert rules with sample scenarios

### 4. Log Management
Logs are automatically collected and stored in Docker volumes. For centralized logging:
1. Deploy ELK stack or use cloud logging service
2. Configure log forwarding from containers
3. Set up log retention policies

## Security Configuration

### 1. SSL Certificate Setup
```bash
# For Let's Encrypt (automated)
certbot certonly --dns-route53 -d your-domain.com -d *.your-domain.com

# Copy certificates to deployment
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deployment/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem deployment/ssl/
```

### 2. Firewall Configuration
```bash
# Configure AWS Security Groups (done via Terraform)
# Additional server-level firewall rules:
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

### 3. Security Scanning
```bash
# Run container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image autograder-backend:latest

# Run application security scan
npm audit --audit-level=high
pip-audit
```

## Backup and Recovery

### 1. Automated Backups
Backups are automatically configured to run daily. To run manual backup:
```bash
./deployment/backup/backup.sh
```

### 2. Restore from Backup
```bash
# List available backups
./deployment/backup/restore.sh --list

# Full restoration
./deployment/backup/restore.sh --full 20231201_143000

# Database only restoration
./deployment/backup/restore.sh --database-only 20231201_143000
```

### 3. Disaster Recovery Testing
```bash
# Test backup integrity
./deployment/backup/backup.sh --verify-only

# Test restoration procedure
./deployment/backup/restore.sh --dry-run 20231201_143000
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check container logs
docker-compose logs service-name

# Check system resources
docker stats

# Verify environment variables
docker-compose config
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
docker-compose exec backend npm run db:test

# Check database logs
docker-compose logs mysql

# Verify credentials
docker-compose exec mysql mysql -u root -p
```

#### 3. SSL/TLS Issues
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443

# Check certificate expiration
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -dates -noout
```

#### 4. Performance Issues
```bash
# Check resource usage
htop
docker stats

# Analyze slow queries
docker-compose exec mysql mysql -e "SHOW PROCESSLIST;"

# Check application metrics
curl http://localhost:9090/metrics
```

### Debugging Commands

#### Container Debugging
```bash
# Execute shell in running container
docker exec -it container-name /bin/bash

# View container configuration
docker inspect container-name

# Check container resource limits
docker stats container-name
```

#### Network Debugging
```bash
# Test connectivity between containers
docker exec -it backend-container ping frontend-container

# Check port bindings
netstat -tulpn | grep :5000

# Trace network requests
tcpdump -i any port 5000
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Monitor resource usage

#### Weekly
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Clean up old log files
- [ ] Test monitoring alerts

#### Monthly
- [ ] Security vulnerability scan
- [ ] Performance optimization review
- [ ] Backup restoration test
- [ ] Documentation updates

#### Quarterly
- [ ] Full security audit
- [ ] Disaster recovery drill
- [ ] Capacity planning review
- [ ] Technology stack updates

### Update Procedures

#### Application Updates
1. Test in staging environment
2. Create database backup
3. Deploy using blue-green strategy
4. Verify functionality
5. Monitor for issues

#### Security Updates
1. Review security advisories
2. Test patches in staging
3. Schedule maintenance window
4. Apply updates with monitoring
5. Verify security posture

#### Infrastructure Updates
1. Plan update strategy
2. Create infrastructure backup
3. Update Terraform configurations
4. Apply changes incrementally
5. Validate all services

### Performance Optimization

#### Database Optimization
```sql
-- Analyze slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Check index usage
SHOW INDEX FROM table_name;

-- Optimize tables
OPTIMIZE TABLE table_name;
```

#### Application Optimization
```bash
# Profile Node.js application
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Memory usage analysis
node --inspect app.js
# Connect Chrome DevTools
```

#### Infrastructure Optimization
```bash
# Monitor resource usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistics Average \
  --start-time 2023-12-01T00:00:00Z \
  --end-time 2023-12-01T23:59:59Z \
  --period 3600
```

## Contact Information

### Development Team
- **Lead Developer**: [lead@yourdomain.com]
- **DevOps Engineer**: [devops@yourdomain.com]
- **QA Engineer**: [qa@yourdomain.com]

### Operations Team
- **Site Reliability Engineer**: [sre@yourdomain.com]
- **Database Administrator**: [dba@yourdomain.com]
- **Security Officer**: [security@yourdomain.com]

### Emergency Contacts
- **On-call Engineer**: [oncall@yourdomain.com]
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Incident Response**: [incident@yourdomain.com]

## Additional Resources

### Documentation
- [API Documentation](docs/api/)
- [Database Schema](docs/database_schema.md)
- [Security Policy](deployment/security/SECURITY_POLICY.md)
- [Testing Framework](TESTING_FRAMEWORK.md)

### External Resources
- [Docker Documentation](https://docs.docker.com/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

This deployment guide should be updated regularly to reflect changes in the system architecture and deployment procedures.
