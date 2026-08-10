BEGIN;

CREATE INDEX IF NOT EXISTS idx_orders_purchased_delivered
    ON orders (purchased_at, order_id) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_customer_purchase
    ON orders (customer_id, purchased_at);
CREATE INDEX IF NOT EXISTS idx_customers_unique_id
    ON customers (customer_unique_id);
CREATE INDEX IF NOT EXISTS idx_customers_state
    ON customers (state);
CREATE INDEX IF NOT EXISTS idx_order_items_product
    ON order_items (product_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller
    ON order_items (seller_id, order_id);
CREATE INDEX IF NOT EXISTS idx_products_category
    ON products (category_name, product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_score
    ON order_reviews (order_id, score);

GRANT CONNECT ON DATABASE commerceiq TO commerceiq_app;
GRANT USAGE ON SCHEMA public TO commerceiq_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO commerceiq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO commerceiq_app;

COMMIT;
