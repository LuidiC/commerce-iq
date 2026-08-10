WITH filtered_items AS (
    SELECT
        s.seller_id,
        s.state,
        o.order_id,
        oi.price
    FROM sellers AS s
    INNER JOIN order_items AS oi ON oi.seller_id = s.seller_id
    INNER JOIN orders AS o ON o.order_id = oi.order_id
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    INNER JOIN products AS p ON p.product_id = oi.product_id
    LEFT JOIN product_categories AS pc ON pc.category_name = p.category_name
    WHERE o.status = 'delivered'
      AND o.purchased_at >= %(start_date)s
      AND o.purchased_at < %(end_date)s
      AND (%(state)s::text IS NULL OR c.state = %(state)s)
      AND (%(seller_id)s::uuid IS NULL OR s.seller_id = %(seller_id)s)
      AND (
          %(category)s::text IS NULL
          OR p.category_name = %(category)s
          OR pc.category_name_english = %(category)s
      )
),
seller_metrics AS (
    SELECT
        seller_id,
        state,
        SUM(price)::numeric(14, 2) AS revenue,
        COUNT(DISTINCT order_id)::integer AS orders
    FROM filtered_items
    GROUP BY seller_id, state
),
order_review_scores AS (
    SELECT order_id, AVG(score) AS order_review_score
    FROM order_reviews
    GROUP BY order_id
),
seller_reviews AS (
    SELECT
        seller_orders.seller_id,
        AVG(order_review_scores.order_review_score)::numeric(4, 2)
            AS average_review_score
    FROM (
        SELECT DISTINCT seller_id, order_id
        FROM filtered_items
    ) AS seller_orders
    INNER JOIN order_review_scores USING (order_id)
    GROUP BY seller_orders.seller_id
)
SELECT
    seller_metrics.seller_id,
    seller_metrics.state,
    seller_metrics.revenue,
    seller_metrics.orders,
    (seller_metrics.revenue / NULLIF(seller_metrics.orders, 0))::numeric(12, 2)
        AS average_order_value,
    seller_reviews.average_review_score,
    RANK() OVER (ORDER BY seller_metrics.revenue DESC) AS revenue_rank
FROM seller_metrics
LEFT JOIN seller_reviews USING (seller_id)
ORDER BY seller_metrics.revenue DESC
LIMIT %(limit)s;
