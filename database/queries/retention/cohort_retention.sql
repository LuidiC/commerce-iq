WITH customer_months AS (
    SELECT DISTINCT
        c.customer_unique_id,
        date_trunc('month', o.purchased_at)::date AS activity_month
    FROM customers AS c
    INNER JOIN orders AS o ON o.customer_id = c.customer_id
    WHERE o.status = 'delivered'
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
WHERE ca.cohort_month >= date_trunc('month', %(start_date)s::date)::date
  AND ca.cohort_month < %(end_date)s
ORDER BY ca.cohort_month, ca.month_number;
