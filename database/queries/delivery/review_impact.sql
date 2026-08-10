WITH delivered_orders AS (
    SELECT
        o.order_id,
        o.purchased_at,
        o.delivered_to_customer_at,
        o.estimated_delivery_at,
        c.state,
        CASE
            WHEN o.delivered_to_customer_at > o.estimated_delivery_at THEN 'late'
            ELSE 'on_time'
        END AS delivery_status,
        EXTRACT(EPOCH FROM (o.delivered_to_customer_at - o.purchased_at)) / 86400.0
            AS delivery_days
    FROM orders AS o
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    WHERE o.status = 'delivered'
      AND o.delivered_to_customer_at IS NOT NULL
      AND o.purchased_at >= %(start_date)s
      AND o.purchased_at < %(end_date)s
      AND (%(state)s::text IS NULL OR c.state = %(state)s)
      AND (
          %(seller_id)s::uuid IS NULL
          OR EXISTS (
              SELECT 1
              FROM order_items AS seller_item
              WHERE seller_item.order_id = o.order_id
                AND seller_item.seller_id = %(seller_id)s
          )
      )
      AND (
          %(category)s::text IS NULL
          OR EXISTS (
              SELECT 1
              FROM order_items AS category_item
              INNER JOIN products AS category_product
                  ON category_product.product_id = category_item.product_id
              LEFT JOIN product_categories AS category_translation
                  ON category_translation.category_name = category_product.category_name
              WHERE category_item.order_id = o.order_id
                AND (
                    category_product.category_name = %(category)s
                    OR category_translation.category_name_english = %(category)s
                )
          )
      )
)
SELECT
    delivery_status,
    COUNT(DISTINCT delivered_orders.order_id)::integer AS orders,
    AVG(delivery_days)::numeric(10, 2) AS average_delivery_days,
    AVG(order_reviews.score)::numeric(4, 2) AS average_review_score,
    ROUND(
        100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0),
        2
    ) AS order_share_pct
FROM delivered_orders
LEFT JOIN order_reviews ON order_reviews.order_id = delivered_orders.order_id
GROUP BY delivery_status
ORDER BY delivery_status;
