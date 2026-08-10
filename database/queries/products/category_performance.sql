WITH category_sales AS (
    SELECT
        COALESCE(pc.category_name_english, p.category_name, 'unknown') AS category,
        SUM(oi.price)::numeric(14, 2) AS revenue,
        COUNT(DISTINCT o.order_id)::integer AS orders,
        SUM(oi.item_number * 0 + 1)::integer AS items,
        AVG(r.score)::numeric(4, 2) AS average_review_score
    FROM orders AS o
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    INNER JOIN order_items AS oi ON oi.order_id = o.order_id
    INNER JOIN products AS p ON p.product_id = oi.product_id
    LEFT JOIN product_categories AS pc ON pc.category_name = p.category_name
    LEFT JOIN order_reviews AS r ON r.order_id = o.order_id
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
    GROUP BY COALESCE(pc.category_name_english, p.category_name, 'unknown')
)
SELECT
    category,
    revenue,
    orders,
    items,
    average_review_score,
    DENSE_RANK() OVER (ORDER BY revenue DESC) AS revenue_rank,
    ROUND(100.0 * revenue / NULLIF(SUM(revenue) OVER (), 0), 2) AS revenue_share_pct
FROM category_sales
ORDER BY revenue DESC
LIMIT %(limit)s;
