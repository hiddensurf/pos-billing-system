# POS Billing System

A full-stack Point of Sale (POS) and Billing System designed for a textile/retail business. The system provides separate Admin and Staff billing portals, product and inventory management, supplier and purchase management, sales and returns, supplier payments, ledger and reports, and a mobile application-style Admin Portal.

## Live Application

**Web Application:**  
https://pos-billing-frontend.onrender.com/login

**Mobile Admin Portal:**  
https://pos-billing-frontend.onrender.com/m/login

**Backend API:**  
https://pos-billing-system-cbmo.onrender.com

**API Documentation:**  
https://pos-billing-system-cbmo.onrender.com/docs

## GitHub Repository

https://github.com/hiddensurf/pos-billing-system

## Features

### Admin Portal

- Dashboard
- Product CRUD
- Category management
- Supplier management
- Staff management
- Purchase management
- Supplier payments
- Product returns
- Supplier ledger
- Sales and transaction management
- Reports
- Inventory and stock tracking
- Low-stock monitoring

### Billing Portal

- Product search by name, SKU, or barcode
- Shopping cart
- Quantity controls
- Stock validation
- Discounts
- Cash, Card, and UPI payment methods
- Cash tendered and change calculation
- Sale creation
- Receipt generation
- 80mm receipt printing
- My Bills Today

### Mobile Admin Portal

A separate mobile application-style web interface is available for the complete Admin Portal.

Mobile routes include:

- Dashboard
- Products
- Categories
- Suppliers
- Staff
- Purchases
- Supplier Payments
- Returns
- Ledger
- Reports

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Native Fetch API

### Backend

- Python
- FastAPI
- SQLModel
- SQLAlchemy
- Alembic
- JWT Authentication
- bcrypt

### Database

- PostgreSQL 17

### Deployment

- Render
- Docker
- Render PostgreSQL

## Authentication and Access Control

The application uses JWT-based authentication with role-based authorization.

### Admin

Administrators have access to the complete Admin Portal and administrative functionality.

### Staff

Staff users have access to the Billing Portal and staff-appropriate transaction functionality. Administrative routes are restricted from staff users.

## Test Credentials

### Admin

```text
Username: admin
Password: admin123