WITH filtered_items AS (
    SELECT
        o.order_id,
        COALESCE(pc.category_name_english, p.category_name, 'unknown') AS category,
        COALESCE(p.category_name, 'unknown') AS category_name,
        oi.price
    FROM orders AS o
    INNER JOIN customers AS c ON c.customer_id = o.customer_id
    INNER JOIN order_items AS oi ON oi.order_id = o.order_id
    INNER JOIN products AS p ON p.product_id = oi.product_id
    LEFT JOIN product_categories AS pc ON pc.category_name = p.category_name
    WHERE o.status = 'delivered'
      AND o.purchased_at >= %(start_date)s
      AND o.purchased_at < %(end_date)s
      AND (%(state)s::text IS NULL OR c.state = %(state)s)
      AND (%(seller_id)s::uuid IS NULL OR oi.seller_id = %(seller_id)s)
      AND (
          %(category)s::text IS NULL
          OR p.category_name = %(category)s
          OR pc.category_name_english = %(category)s
      )
),
category_sales AS (
    SELECT
        category,
        MIN(category_name) AS category_name,
        SUM(price)::numeric(14, 2) AS revenue,
        COUNT(DISTINCT order_id)::integer AS orders,
        COUNT(*)::integer AS items
    FROM filtered_items
    GROUP BY category
),
order_review_scores AS (
    SELECT order_id, AVG(score) AS order_review_score
    FROM order_reviews
    GROUP BY order_id
),
category_reviews AS (
    SELECT
        category_orders.category,
        AVG(order_review_scores.order_review_score)::numeric(4, 2) AS average_review_score
    FROM (
        SELECT DISTINCT category, order_id
        FROM filtered_items
    ) AS category_orders
    INNER JOIN order_review_scores USING (order_id)
    GROUP BY category_orders.category
)
SELECT
    category_sales.category,
    category_sales.category_name,
    category_sales.category AS category_name_english,
    category_sales.revenue,
    category_sales.orders,
    category_sales.items,
    category_reviews.average_review_score,
    DENSE_RANK() OVER (ORDER BY category_sales.revenue DESC) AS revenue_rank,
    ROUND(
        100.0 * category_sales.revenue
        / NULLIF(SUM(category_sales.revenue) OVER (), 0),
        2
    ) AS revenue_share_pct
FROM category_sales
LEFT JOIN category_reviews USING (category)
ORDER BY category_sales.revenue DESC
LIMIT %(limit)s;
