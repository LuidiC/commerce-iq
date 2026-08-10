WITH purchases AS (
    SELECT
        c.customer_unique_id,
        o.order_id,
        o.purchased_at,
        SUM(oi.price)::numeric(12, 2) AS order_value
    FROM customers AS c
    INNER JOIN orders AS o ON o.customer_id = c.customer_id
    INNER JOIN order_items AS oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY c.customer_unique_id, o.order_id, o.purchased_at
)
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
    ) AS previous_purchase_at,
    EXTRACT(
        DAY FROM purchased_at - LAG(purchased_at) OVER (
            PARTITION BY customer_unique_id ORDER BY purchased_at, order_id
        )
    )::integer AS days_since_previous_purchase
FROM purchases
WHERE customer_unique_id IN (
    SELECT customer_unique_id
    FROM purchases
    GROUP BY customer_unique_id
    HAVING COUNT(*) > 1
)
ORDER BY customer_unique_id, purchase_number;
