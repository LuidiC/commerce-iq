WITH customer_months AS (
    SELECT DISTINCT
        c.customer_unique_id,
        date_trunc('month', o.purchased_at)::date AS activity_month
    FROM customers AS c
    INNER JOIN orders AS o ON o.customer_id = c.customer_id
    WHERE o.status = 'delivered'
      AND o.purchased_at < %(end_date)s
      AND (%(state)s IS NULL OR c.state = %(state)s)
      AND (
          %(seller_id)s IS NULL
          OR EXISTS (
              SELECT 1
              FROM order_items AS seller_item
              WHERE seller_item.order_id = o.order_id
                AND seller_item.seller_id = %(seller_id)s
          )
      )
      AND (
          %(category)s IS NULL
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
cohort_membership AS (
    SELECT
        customer_unique_id,
        activity_month,
        MIN(activity_month) OVER (PARTITION BY customer_unique_id) AS cohort_month
    FROM customer_months
),
cohort_activity AS (
    SELECT
        cohort_month,
        (
            EXTRACT(YEAR FROM age(activity_month, cohort_month)) * 12
            + EXTRACT(MONTH FROM age(activity_month, cohort_month))
        )::integer AS month_number,
        COUNT(DISTINCT customer_unique_id)::integer AS active_customers
    FROM cohort_membership
    GROUP BY cohort_month, month_number
),
cohort_sizes AS (
    SELECT cohort_month, active_customers AS cohort_size
    FROM cohort_activity
    WHERE month_number = 0
)
SELECT
    ca.cohort_month,
    ca.month_number,
    cs.cohort_size,
    ca.active_customers,
    ROUND(100.0 * ca.active_customers / NULLIF(cs.cohort_size, 0), 2) AS retention_rate_pct
FROM cohort_activity AS ca
INNER JOIN cohort_sizes AS cs USING (cohort_month)
WHERE ca.cohort_month >= %(start_date)s
  AND ca.cohort_month < %(end_date)s
ORDER BY ca.cohort_month, ca.month_number;
