#!/usr/bin/env node

/**
 * Health Check Script for Auto-Grader Backend
 * This script performs comprehensive health checks for the backend service
 */

const http = require('http');
const { execSync } = require('child_process');

class HealthChecker {
    constructor() {
        this.checks = [];
        this.results = [];
        this.exitCode = 0;
    }

    /**
     * Add a health check
     */
    addCheck(name, checkFunction) {
        this.checks.push({ name, check: checkFunction });
    }

    /**
     * Run all health checks
     */
    async runChecks() {
        console.log('🏥 Auto-Grader Backend Health Check');
        console.log('=====================================\n');

        for (const { name, check } of this.checks) {
            try {
                const startTime = Date.now();
                const result = await check();
                const duration = Date.now() - startTime;
                
                this.results.push({
                    name,
                    status: 'PASS',
                    duration,
                    details: result
                });
                
                console.log(`✅ ${name} (${duration}ms)`);
                if (result && typeof result === 'string') {
                    console.log(`   ${result}`);
                }
            } catch (error) {
                this.results.push({
                    name,
                    status: 'FAIL',
                    error: error.message
                });
                
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
                this.exitCode = 1;
            }
            console.log();
        }
    }

    /**
     * Print summary and exit
     */
    finish() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${this.results.length}`);
        
        if (this.exitCode === 0) {
            console.log('\n🎉 All health checks passed!');
        } else {
            console.log('\n💥 Some health checks failed!');
        }
        
        process.exit(this.exitCode);
    }
}

/**
 * HTTP request helper
 */
function httpRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ statusCode: res.statusCode, data });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * Health check functions
 */
const healthChecks = {
    /**
     * Check if the HTTP server is responding
     */
    async httpServer() {
        const port = process.env.PORT || 5000;
        const response = await httpRequest({
            hostname: 'localhost',
            port: port,
            path: '/api/health',
            method: 'GET'
        });
        
        return `Server responding on port ${port}`;
    },

    /**
     * Check database connectivity
     */
    async database() {
        // Use the detailed health endpoint which doesn't require auth
        const response = await httpRequest({
            hostname: 'localhost',
            port: process.env.PORT || 5000,
            path: '/api/health/detailed',
            method: 'GET'
        });

        const data = JSON.parse(response.data);
        if (!data.checks || data.checks.database !== true) {
            throw new Error('Database not connected');
        }

        return `Database connectivity: OK`;
    },

    /**
     * Check Redis connectivity
     */
    async redis() {
        const response = await httpRequest({
            hostname: 'localhost',
            port: process.env.PORT || 5000,
            path: '/api/health/detailed',
            method: 'GET'
        });

        const data = JSON.parse(response.data);
        if (!data.checks || data.checks.cache !== true) {
            throw new Error('Redis not connected');
        }

        return `Redis connectivity: OK`;
    },

    /**
     * Check file system accessibility
     */
    async fileSystem() {
        const fs = require('fs').promises;
        const path = require('path');
        
        const storageDir = process.env.UPLOAD_DIR || './storage';
        const testFile = path.join(storageDir, '.health_check');
        
        try {
            // Test write
            await fs.writeFile(testFile, 'health_check');
            
            // Test read
            const content = await fs.readFile(testFile, 'utf8');
            if (content !== 'health_check') {
                throw new Error('File content mismatch');
            }
            
            // Cleanup
            await fs.unlink(testFile);
            
            return `Storage directory accessible: ${storageDir}`;
        } catch (error) {
            throw new Error(`File system check failed: ${error.message}`);
        }
    },

    /**
     * Check ML service connectivity
     */
    async mlService() {
        try {
            const response = await httpRequest({
                hostname: 'localhost',
                port: 5001,
                path: '/health',
                method: 'GET'
            });
            
            return 'ML service responding';
        } catch (error) {
            throw new Error(`ML service not accessible: ${error.message}`);
        }
    },

    /**
     * Check system resources
     */
    async systemResources() {
        const os = require('os');
        
        // Check memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
        
        if (usedMemPercent > 90) {
            throw new Error(`High memory usage: ${usedMemPercent.toFixed(1)}%`);
        }
        
        // Check CPU load
        const loadAvg = os.loadavg()[0];
        const cpuCount = os.cpus().length;
        const loadPercent = (loadAvg / cpuCount) * 100;
        
        if (loadPercent > 80) {
            throw new Error(`High CPU load: ${loadPercent.toFixed(1)}%`);
        }
        
        return `Memory: ${usedMemPercent.toFixed(1)}% used, CPU load: ${loadPercent.toFixed(1)}%`;
    },

    /**
     * Check disk space
     */
    async diskSpace() {
        try {
            const output = execSync('df -h /', { encoding: 'utf8' });
            const lines = output.trim().split('\n');
            const diskInfo = lines[1].split(/\s+/);
            const usedPercent = parseInt(diskInfo[4].replace('%', ''));
            
            if (usedPercent > 85) {
                throw new Error(`Low disk space: ${usedPercent}% used`);
            }
            
            return `Disk usage: ${usedPercent}% used`;
        } catch (error) {
            throw new Error(`Disk space check failed: ${error.message}`);
        }
    },

    /**
     * Check environment configuration
     */
    async configuration() {
        const requiredEnvVars = [
            'DB_HOST',
            'DB_USER',
            'DB_NAME',
            'JWT_SECRET'
        ];
        
        const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        
        return `All required environment variables present`;
    },

    /**
     * Check log files
     */
    async logFiles() {
        const fs = require('fs').promises;
        const path = require('path');
        
        const logDir = './logs';
        const logFiles = ['combined.log', 'error.log'];
        
        for (const logFile of logFiles) {
            const logPath = path.join(logDir, logFile);
            try {
                const stats = await fs.stat(logPath);
                
                // Check if log file is too large (>100MB)
                if (stats.size > 100 * 1024 * 1024) {
                    throw new Error(`Log file ${logFile} is too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }
        
        return 'Log files are within acceptable limits';
    }
};

/**
 * Main execution
 */
async function main() {
    const checker = new HealthChecker();
    
    // Add all health checks
    for (const [name, checkFunction] of Object.entries(healthChecks)) {
        checker.addCheck(name, checkFunction);
    }
    
    // Run checks
    await checker.runChecks();
    
    // Print summary and exit
    checker.finish();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error.message);
    process.exit(1);
});

// Run health checks
main();
