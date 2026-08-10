EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    p.category_name,
    SUM(oi.price) AS revenue
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.order_id
INNER JOIN products AS p ON p.product_id = oi.product_id
WHERE o.status = 'delivered'
  AND o.purchased_at >= DATE '2017-01-01'
  AND o.purchased_at < DATE '2018-01-01'
GROUP BY p.category_name
ORDER BY revenue DESC;
