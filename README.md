# E-Commerce API

A complete e-commerce backend API built with Node.js, Express, and MongoDB.

## Features

- User authentication with JWT
- Role-based access control (Customer/Admin)
- Product inventory management
- Order management with payment simulation
- Automatic stock management
- Rate limiting and caching
- Pagination and filtering

## Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT
- Bcrypt

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=ecommerce2026
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

3. Start MongoDB

4. Run the server:
```bash
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/profile` - Get user profile

### Products
- GET `/api/inventory/products` - List all products
- GET `/api/inventory/products/:id` - Get product by ID
- POST `/api/inventory/products` - Create product (Admin only)
- PATCH `/api/inventory/products/:id/stock` - Update stock (Admin only)

### Orders
- POST `/api/orders` - Create new order
- GET `/api/orders/my-orders` - Get customer orders
- GET `/api/orders/all` - Get all orders (Admin only)
- GET `/api/orders/:orderId` - Get order by ID
- GET `/api/orders/:orderId/cancel` - Cancel order

## Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Request handlers
├── middleware/      # Authentication, validation, error handling
├── models/          # Database schemas
├── routes/          # API routes
├── utils/           # Helper functions
└── server.js        # Application entry point
```

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Role-based authorization
- Rate limiting (10 requests per minute)
- Input validation

## Payment Processing

- Asynchronous payment simulation
- Random success/failure
- Automatic stock restoration on payment failure
- Automatic stock restoration on order cancellation
