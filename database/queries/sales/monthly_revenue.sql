WITH month_spine AS (
    SELECT generate_series(
        date_trunc('month', %(start_date)s::date),
        date_trunc('month', %(end_date)s::date - 1),
        INTERVAL '1 month'
    )::date AS month
),
monthly_sales AS (
    SELECT
        date_trunc('month', o.purchased_at)::date AS month,
        SUM(oi.price)::numeric(14, 2) AS revenue,
        COUNT(DISTINCT o.order_id)::integer AS orders
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
    GROUP BY date_trunc('month', o.purchased_at)
),
complete_months AS (
    SELECT
        month_spine.month,
        COALESCE(monthly_sales.revenue, 0)::numeric(14, 2) AS revenue,
        COALESCE(monthly_sales.orders, 0)::integer AS orders
    FROM month_spine
    LEFT JOIN monthly_sales USING (month)
),
period_comparison AS (
    SELECT
        month,
        revenue,
        orders,
        LAG(revenue) OVER (ORDER BY month) AS previous_revenue,
        SUM(revenue) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS cumulative_revenue,
        AVG(revenue) OVER (
            ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) AS revenue_moving_average_3m,
        LEAD(revenue) OVER (ORDER BY month) AS next_revenue
    FROM complete_months
)
SELECT
    month,
    revenue,
    orders,
    CASE
        WHEN previous_revenue IS NULL OR previous_revenue = 0 THEN NULL
        ELSE ROUND((revenue - previous_revenue) * 100.0 / previous_revenue, 2)
    END AS month_over_month_pct,
    cumulative_revenue::numeric(16, 2),
    revenue_moving_average_3m::numeric(14, 2),
    next_revenue::numeric(14, 2)
FROM period_comparison
ORDER BY month;
