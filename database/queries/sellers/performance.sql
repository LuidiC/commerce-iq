WITH seller_metrics AS (
    SELECT
        s.seller_id,
        s.state,
        SUM(oi.price)::numeric(14, 2) AS revenue,
        COUNT(DISTINCT o.order_id)::integer AS orders,
        AVG(r.score)::numeric(4, 2) AS average_review_score
    FROM sellers AS s
    INNER JOIN order_items AS oi ON oi.seller_id = s.seller_id
    INNER JOIN orders AS o ON o.order_id = oi.order_id
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    INNER JOIN products AS p ON p.product_id = oi.product_id
    LEFT JOIN product_categories AS pc ON pc.category_name = p.category_name
    LEFT JOIN order_reviews AS r ON r.order_id = o.order_id
    WHERE o.status = 'delivered'
      AND o.purchased_at >= %(start_date)s
      AND o.purchased_at < %(end_date)s
      AND (%(state)s IS NULL OR c.state = %(state)s)
      AND (%(seller_id)s IS NULL OR s.seller_id = %(seller_id)s)
      AND (
          %(category)s IS NULL
          OR p.category_name = %(category)s
          OR pc.category_name_english = %(category)s
      )
    GROUP BY s.seller_id, s.state
)
SELECT
    seller_id,
    state,
    revenue,
    orders,
    (revenue / NULLIF(orders, 0))::numeric(12, 2) AS average_order_value,
    average_review_score,
    RANK() OVER (ORDER BY revenue DESC) AS revenue_rank
FROM seller_metrics
ORDER BY revenue DESC
LIMIT %(limit)s;
