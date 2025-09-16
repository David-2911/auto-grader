// Compatibility shim: expose the ML service from backend/ml/services so local service imports work
module.exports = require('../../ml/services/ml.service');
