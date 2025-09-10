# Performance Testing Configuration

Configuration file for performance testing using Artillery.js

## Load Testing Scenarios

### 1. Authentication Load Test
Tests user login/logout under various load conditions

### 2. Assignment Submission Load Test  
Tests file upload and submission processing under load

### 3. Grading System Load Test
Tests automated grading system performance

### 4. Dashboard Load Test
Tests dashboard data loading and real-time updates

## Usage

```bash
# Install Artillery
npm install -g artillery

# Run load tests
artillery run load/auth-load-test.yml
artillery run load/submission-load-test.yml
artillery run load/grading-load-test.yml

# Run stress tests
artillery run stress/concurrent-users-test.yml
artillery run stress/file-upload-stress-test.yml

# Generate HTML reports
artillery run --output results.json load/auth-load-test.yml
artillery report results.json
```

## Performance Targets

- **Response Time**: < 2s for 95% of requests
- **Throughput**: > 100 requests/second
- **Error Rate**: < 1%
- **Concurrent Users**: 500+ simultaneous users
- **File Upload**: 50MB files within 30s
- **Database**: Query response < 100ms
