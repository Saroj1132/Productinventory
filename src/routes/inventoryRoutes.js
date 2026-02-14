const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');

const router = express.Router();

router.get('/products', inventoryController.listProducts);
router.get('/products/:productId', inventoryController.getProductById);
router.post('/products', authenticate, authorize('Admin'), validate(schemas.createProduct), inventoryController.createProduct);
router.patch('/products/:productId/stock', authenticate, authorize('Admin'), validate(schemas.updateStock), inventoryController.updateStock);

module.exports = router;
