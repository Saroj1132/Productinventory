const Product = require('../models/product');
const { getCached, setCached, clearCache } = require('../utils/cache');

exports.listProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `products_p${page}_l${limit}`;
    const cachedProducts = getCached(cacheKey);
    
    if (cachedProducts) {
      return res.json(cachedProducts);
    }

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    const response = {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    setCached(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;

    const product = new Product({
      name,
      description,
      price,
      stock,
      category
    });

    await product.save();

    clearCache('prod_');
    clearCache('products_');
    clearCache('ord_');
    clearCache('user_orders');
    clearCache('all_orders');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.stock = stock;
    await product.save();

    clearCache('prod_');
    clearCache('products_');
    clearCache('ord_');
    clearCache('user_orders');
    clearCache('all_orders');

    res.json({
      message: 'Stock updated successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cacheKey = `prod_${productId}`;
    const cachedProduct = getCached(cacheKey);
    
    if (cachedProduct) {
      return res.json(cachedProduct);
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const response = { product };
    
    setCached(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    next(error);
  }
};
