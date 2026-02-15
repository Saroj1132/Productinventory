const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');
const generateOrderId = require('../utils/orderIdGenerator');
const simulatePayment = require('../utils/paymentSimulator');
const { getCached, setCached, clearCache } = require('../utils/cache');

exports.createOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    const userId = req.user._id;

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      let product;
      try {
        product = await Product.findById(item.product);
      } catch (err) {
        if (err.name === 'CastError') {
          return res.status(400).json({ error: 'Invalid product ID format' });
        }
        throw err;
      }

      if (!product) {
        return res.status(404).json({ error: `Product not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    const order = new Order({
      orderId: generateOrderId(),
      user: userId,
      items: orderItems,
      totalAmount,
      status: 'CREATED'
    });

    await order.save();

    clearCache('user_orders');
    clearCache('all_orders');
    clearCache('prod_');
    clearCache('products_');

    await processPayment(order._id);

    const orderDetails = await Order.findOne({ orderId: order.orderId
    }).populate('items.product').populate('user', '-password');

    res.status(201).json({
      message: 'Order created successfully',
      order: orderDetails
    });
  } catch (error) {
    next(error);
  }
};

const processPayment = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate('items.product');

    const paymentSuccess = await simulatePayment();

    if (paymentSuccess) {
      order.paymentStatus = 'SUCCESS';
      order.status = 'CONFIRMED';
      await order.save();
    } else {
      order.paymentStatus = 'FAILED';
      await order.save();

      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stock: item.quantity } }
        );
      }
    }

    clearCache('user_orders');
    clearCache('all_orders');
    clearCache('prod_');
    clearCache('products_');
  } catch (error) {
    console.error('Payment processing error:', error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();

    const cacheKey = `ord_${orderId}_${userId}`;
    const cachedOrder = getCached(cacheKey);
    
    if (cachedOrder) {
      return res.json(cachedOrder);
    }

    const order = await Order.findOne({ orderId })
      .populate('items.product')
      .populate('user', '-password');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'Admin' && order.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const response = { order };
    
    setCached(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    const userId = req.user._id.toString();

    const cacheKey = `user_orders_${userId}_p${page}_l${limit}_${status || 'all'}`;
    const cachedOrders = getCached(cacheKey);
    
    if (cachedOrders) {
      return res.json(cachedOrders);
    }

    const query = { user: req.user._id };
    if (status) {
      query.status = status.toUpperCase();
    }

    const orders = await Order.find(query)
      .populate({
        path: 'items.product',
        model: 'product'
      })
      .populate({
        path: 'user',
        model: 'user',
        select: '-password'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    const response = {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    setCached(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const cacheKey = `all_orders_p${page}_l${limit}_${status || 'all'}`;
    const cachedOrders = getCached(cacheKey);
    
    if (cachedOrders) {
      return res.json(cachedOrders);
    }

    const query = {};
    if (status) {
      query.status = status.toUpperCase();
    }

    const orders = await Order.find(query)
      .populate('items.product')
      .populate('user', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    const response = {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    setCached(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'Admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.paymentStatus === 'FAILED') {
      return res.status(400).json({ error: "Payment failed and cannot be cancelled." });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    if (order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot cancel delivered order' });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    order.status = 'CANCELLED';
    await order.save();

    clearCache('user_orders');
    clearCache('all_orders');
    clearCache('ord_');
    clearCache('prod_');
    clearCache('products_');

    
    const orderDetails = await Order.findOne({ orderId: order.orderId
    }).populate('items.product').populate('user', '-password');

    res.json({
      message: 'Order cancelled successfully',
      order: orderDetails
    });
  } catch (error) {
    next(error);
  }
};
