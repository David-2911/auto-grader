#!/usr/bin/env node

// Script to find missing controller methods

const fs = require('fs');
const path = require('path');

function extractMethodsFromRoutes(routeFile) {
  const content = fs.readFileSync(routeFile, 'utf8');
  const regex = /(\w+)Controller\.(\w+)/g;
  const methods = new Set();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    methods.add(match[2]);
  }
  
  return Array.from(methods);
}

function extractMethodsFromController(controllerFile) {
  if (!fs.existsSync(controllerFile)) {
    return [];
  }
  const content = fs.readFileSync(controllerFile, 'utf8');
  
  // Check for both exports.method and class method patterns
  const exportsRegex = /exports\.(\w+)\s*=/g;
  const classMethodRegex = /async\s+(\w+)\s*\(/g;
  
  const methods = new Set();
  let match;
  
  // Look for exports.method pattern
  while ((match = exportsRegex.exec(content)) !== null) {
    methods.add(match[1]);
  }
  
  // Look for class method pattern (if no exports found)
  if (methods.size === 0) {
    while ((match = classMethodRegex.exec(content)) !== null) {
      const methodName = match[1];
      // Skip constructor and common non-controller methods
      if (!['constructor', 'toString', 'valueOf'].includes(methodName)) {
        methods.add(methodName);
      }
    }
  }
  
  return Array.from(methods);
}

function checkController(routeFile, controllerFile, name) {
  console.log(`\n=== ${name.toUpperCase()} CONTROLLER ===`);
  
  if (!fs.existsSync(routeFile)) {
    console.log(`❌ Route file not found: ${routeFile}`);
    return;
  }
  
  const routeMethods = extractMethodsFromRoutes(routeFile);
  const controllerMethods = extractMethodsFromController(controllerFile);
  
  const missingMethods = routeMethods.filter(method => 
    !controllerMethods.includes(method)
  );
  
  console.log('Methods referenced in routes:', routeMethods.length);
  console.log('Methods defined in controller:', controllerMethods.length);
  
  if (missingMethods.length === 0) {
    console.log('✅ All methods are implemented');
  } else {
    console.log('❌ Missing methods:');
    missingMethods.forEach(method => console.log(`  - ${method}`));
  }
}

// Check all controllers
checkController('./src/routes/teacher.routes.js', './src/controllers/teacher.controller.js', 'teacher');
checkController('./src/routes/admin.routes.js', './src/controllers/admin.controller.js', 'admin');
checkController('./src/routes/student.routes.js', './src/controllers/student.controller.js', 'student');
checkController('./src/routes/auth.routes.js', './src/controllers/auth.controller.js', 'auth');
checkController('./src/routes/user.routes.js', './src/controllers/user.controller.js', 'user');
checkController('./src/routes/assignment.routes.js', './src/controllers/assignment.controller.js', 'assignment');
checkController('./src/routes/file.routes.js', './src/controllers/file.controller.js', 'file');
checkController('./src/routes/performance.routes.js', './src/controllers/performance.controller.js', 'performance');