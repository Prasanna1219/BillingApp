
-- Users Table (for Authentication & Roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    username VARCHAR(100),
    password VARCHAR(255),
    role ENUM('Owner', 'Secondary Admin', 'Biller') DEFAULT 'Biller',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15),
    outlet_address TEXT,
    upi_id VARCHAR(100),
    fssai_number VARCHAR(50),
    tax_slab DECIMAL(5,2),
    seating_capacity INT,
    business_type VARCHAR(100),
    business_category VARCHAR(100),
    gstin VARCHAR(15),
    footer_message TEXT,
    google_link VARCHAR(255),
    swiggy_link VARCHAR(255),
    zomato_link VARCHAR(255),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    phone_number VARCHAR(15) NOT NULL,
    name VARCHAR(100),
    loyalty_discount DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business_profile(id) ON DELETE CASCADE
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (business_id) REFERENCES business_profile(id) ON DELETE CASCADE
);

-- Items / Inventory Table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    sales_price DECIMAL(10,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    price_includes_tax BOOLEAN DEFAULT false,
    current_stock INT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    FOREIGN KEY (business_id) REFERENCES business_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    customer_id INT NULL,
    biller_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Closed', 'On-Hold', 'Cancelled') DEFAULT 'Closed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (biller_id) REFERENCES users(id) ON DELETE SET NULL
);
