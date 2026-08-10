WITH filtered_orders AS (
    SELECT
        o.order_id,
        o.purchased_at,
        c.customer_unique_id
    FROM orders AS o
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    WHERE o.status = 'delivered'
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
),
order_values AS (
    SELECT
        filtered_orders.order_id,
        filtered_orders.customer_unique_id,
        SUM(order_items.price) AS revenue
    FROM filtered_orders
    INNER JOIN order_items ON order_items.order_id = filtered_orders.order_id
    INNER JOIN products ON products.product_id = order_items.product_id
    LEFT JOIN product_categories
        ON product_categories.category_name = products.category_name
    WHERE (%(seller_id)s::uuid IS NULL OR order_items.seller_id = %(seller_id)s)
      AND (
          %(category)s::text IS NULL
          OR products.category_name = %(category)s
          OR product_categories.category_name_english = %(category)s
      )
    GROUP BY filtered_orders.order_id, filtered_orders.customer_unique_id
),
review_scores AS (
    SELECT AVG(order_reviews.score)::numeric(4, 2) AS average_review_score
    FROM filtered_orders
    INNER JOIN order_reviews ON order_reviews.order_id = filtered_orders.order_id
)
SELECT
    COALESCE(SUM(order_values.revenue), 0)::numeric(14, 2) AS revenue,
    COUNT(order_values.order_id)::integer AS orders,
    COALESCE(AVG(order_values.revenue), 0)::numeric(12, 2) AS average_order_value,
    COUNT(DISTINCT order_values.customer_unique_id)::integer AS customers,
    COALESCE(MAX(review_scores.average_review_score), 0)::numeric(4, 2) AS average_review_score
FROM order_values
CROSS JOIN review_scores;
