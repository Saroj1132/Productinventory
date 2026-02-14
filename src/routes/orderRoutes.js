const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');

const router = express.Router();

router.post('/', authenticate, validate(schemas.createOrder), orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getCustomerOrders);
router.get('/all', authenticate, authorize('Admin'), orderController.getAllOrders);
router.get('/:orderId', authenticate, orderController.getOrderById);
router.get('/:orderId/cancel', authenticate, orderController.cancelOrder);

module.exports = router;
