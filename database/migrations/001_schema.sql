BEGIN;

CREATE TABLE IF NOT EXISTS etl_batches (
    batch_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_name text NOT NULL,
    source_sha256 char(64) NOT NULL UNIQUE,
    status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    rows_loaded jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text
);

CREATE TABLE IF NOT EXISTS geolocations (
    zip_code_prefix integer PRIMARY KEY CHECK (zip_code_prefix BETWEEN 1000 AND 99999),
    latitude numeric(9, 6) NOT NULL CHECK (latitude BETWEEN -34 AND 6),
    longitude numeric(9, 6) NOT NULL CHECK (longitude BETWEEN -74 AND -28),
    city text NOT NULL,
    state char(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id uuid PRIMARY KEY,
    customer_unique_id uuid NOT NULL,
    zip_code_prefix integer NOT NULL,
    city text NOT NULL,
    state char(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS sellers (
    seller_id uuid PRIMARY KEY,
    zip_code_prefix integer NOT NULL,
    city text NOT NULL,
    state char(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS product_categories (
    category_name text PRIMARY KEY,
    category_name_english text NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id uuid PRIMARY KEY,
    category_name text REFERENCES product_categories(category_name),
    name_length integer CHECK (name_length >= 0),
    description_length integer CHECK (description_length >= 0),
    photos_quantity integer CHECK (photos_quantity >= 0),
    weight_g numeric(10, 2) CHECK (weight_g > 0),
    length_cm numeric(10, 2) CHECK (length_cm > 0),
    height_cm numeric(10, 2) CHECK (height_cm > 0),
    width_cm numeric(10, 2) CHECK (width_cm > 0)
);

CREATE TABLE IF NOT EXISTS orders (
    order_id uuid PRIMARY KEY,
    customer_id uuid NOT NULL REFERENCES customers(customer_id),
    status text NOT NULL CHECK (
        status IN ('approved', 'canceled', 'created', 'delivered', 'invoiced',
                   'processing', 'shipped', 'unavailable')
    ),
    purchased_at timestamp NOT NULL,
    approved_at timestamp,
    delivered_to_carrier_at timestamp,
    delivered_to_customer_at timestamp,
    estimated_delivery_at timestamp NOT NULL,
    CHECK (approved_at IS NULL OR approved_at >= purchased_at),
    CHECK (delivered_to_customer_at IS NULL OR delivered_to_customer_at >= purchased_at)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_id uuid NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_number smallint NOT NULL CHECK (item_number > 0),
    product_id uuid NOT NULL REFERENCES products(product_id),
    seller_id uuid NOT NULL REFERENCES sellers(seller_id),
    shipping_limit_at timestamp NOT NULL,
    price numeric(12, 2) NOT NULL CHECK (price >= 0),
    freight_value numeric(12, 2) NOT NULL CHECK (freight_value >= 0),
    PRIMARY KEY (order_id, item_number)
);

CREATE TABLE IF NOT EXISTS order_payments (
    order_id uuid NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    payment_sequence smallint NOT NULL CHECK (payment_sequence > 0),
    payment_type text NOT NULL,
    installments smallint NOT NULL CHECK (installments >= 0),
    payment_value numeric(12, 2) NOT NULL CHECK (payment_value >= 0),
    PRIMARY KEY (order_id, payment_sequence)
);

CREATE TABLE IF NOT EXISTS order_reviews (
    review_id uuid NOT NULL,
    order_id uuid NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
    title text,
    message text,
    created_at timestamp NOT NULL,
    answered_at timestamp NOT NULL,
    PRIMARY KEY (review_id, order_id)
);

COMMENT ON TABLE customers IS 'One customer_id per order; customer_unique_id links repeat purchases without exposing identities.';
COMMENT ON COLUMN order_items.price IS 'Item gross merchandise value excluding freight; primary revenue basis for CommerceIQ.';
COMMENT ON TABLE geolocations IS 'One representative centroid per ZIP prefix, derived from duplicate raw geolocation points.';

COMMIT;
