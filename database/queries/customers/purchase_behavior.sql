WITH customer_orders AS (
    SELECT
        c.customer_unique_id,
        o.order_id,
        o.purchased_at,
        SUM(oi.price)::numeric(12, 2) AS order_value
    FROM customers AS c
    INNER JOIN orders AS o ON o.customer_id = c.customer_id
    INNER JOIN order_items AS oi ON oi.order_id = o.order_id
    INNER JOIN products AS p ON p.product_id = oi.product_id
    LEFT JOIN product_categories AS pc ON pc.category_name = p.category_name
    WHERE o.status = 'delivered'
      AND o.purchased_at >= %(start_date)s
      AND o.purchased_at < %(end_date)s
      AND (%(state)s IS NULL OR c.state = %(state)s)
      AND (%(seller_id)s IS NULL OR oi.seller_id = %(seller_id)s)
      AND (
          %(category)s IS NULL
          OR p.category_name = %(category)s
          OR pc.category_name_english = %(category)s
      )
    GROUP BY c.customer_unique_id, o.order_id, o.purchased_at
),
sequenced AS (
    SELECT
        customer_unique_id,
        order_id,
        purchased_at,
        order_value,
        ROW_NUMBER() OVER (
            PARTITION BY customer_unique_id ORDER BY purchased_at, order_id
        ) AS purchase_number,
        LAG(purchased_at) OVER (
            PARTITION BY customer_unique_id ORDER BY purchased_at, order_id
        ) AS previous_purchase_at
    FROM customer_orders
),
customer_summary AS (
    SELECT
        customer_unique_id,
        COUNT(*) AS purchase_count,
        SUM(order_value) AS lifetime_value,
        AVG(EXTRACT(EPOCH FROM (purchased_at - previous_purchase_at)) / 86400.0)
            FILTER (WHERE previous_purchase_at IS NOT NULL) AS average_days_between_purchases
    FROM sequenced
    GROUP BY customer_unique_id
)
SELECT
    COUNT(*)::integer AS customers,
    COUNT(*) FILTER (WHERE purchase_count > 1)::integer AS repeat_customers,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE purchase_count > 1) / NULLIF(COUNT(*), 0),
        2
    ) AS repeat_customer_rate_pct,
    AVG(average_days_between_purchases)::numeric(10, 2) AS average_days_between_purchases,
    COUNT(*) FILTER (WHERE lifetime_value >= 500)::integer AS high_value_customers
FROM customer_summary;
