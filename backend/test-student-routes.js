const express = require('express');
const router = express.Router();
const studentController = require('./src/controllers/student.controller');

console.log('Testing student controller methods...');
console.log('getDashboard type:', typeof studentController.getDashboard);

// Test a simple route
router.get('/test', studentController.getDashboard);

console.log('Router setup complete');
module.exports = router;