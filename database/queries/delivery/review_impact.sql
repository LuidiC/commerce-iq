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
          (%(seller_id)s::uuid IS NULL AND %(category)s::text IS NULL)
          OR EXISTS (
              SELECT 1
              FROM order_items AS filtered_item
              INNER JOIN products AS filtered_product
                  ON filtered_product.product_id = filtered_item.product_id
              LEFT JOIN product_categories AS filtered_translation
                  ON filtered_translation.category_name = filtered_product.category_name
              WHERE filtered_item.order_id = o.order_id
                AND (
                    %(seller_id)s::uuid IS NULL
                    OR filtered_item.seller_id = %(seller_id)s
                )
                AND (
                    %(category)s::text IS NULL
                    OR filtered_product.category_name = %(category)s
                    OR filtered_translation.category_name_english = %(category)s
                )
          )
      )
),
order_review_scores AS (
    SELECT order_id, AVG(score) AS order_review_score
    FROM order_reviews
    GROUP BY order_id
)
SELECT
    delivery_status,
    COUNT(*)::integer AS orders,
    AVG(delivery_days)::numeric(10, 2) AS average_delivery_days,
    AVG(order_review_scores.order_review_score)::numeric(4, 2) AS average_review_score,
    ROUND(
        100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0),
        2
    ) AS order_share_pct
FROM delivered_orders
LEFT JOIN order_review_scores ON order_review_scores.order_id = delivered_orders.order_id
GROUP BY delivery_status
ORDER BY delivery_status;
