import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) * 100 / previous, 2)


def clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean(item) for item in value]
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value


def load_sources(data_dir: Path) -> dict[str, pd.DataFrame]:
    orders = pd.read_csv(
        data_dir / "olist_orders_dataset.csv",
        parse_dates=[
            "order_purchase_timestamp",
            "order_delivered_customer_date",
            "order_estimated_delivery_date",
        ],
    )
    customers = pd.read_csv(data_dir / "olist_customers_dataset.csv")
    items = pd.read_csv(data_dir / "olist_order_items_dataset.csv")
    products = pd.read_csv(data_dir / "olist_products_dataset.csv")
    translations = pd.read_csv(data_dir / "product_category_name_translation.csv")
    sellers = pd.read_csv(data_dir / "olist_sellers_dataset.csv")
    reviews = pd.read_csv(
        data_dir / "olist_order_reviews_dataset.csv",
        usecols=["order_id", "review_score"],
    ).drop_duplicates("order_id")

    products = products.merge(translations, on="product_category_name", how="left")
    products["category"] = products["product_category_name_english"].fillna(
        products["product_category_name"]
    )
    delivered = orders.loc[orders["order_status"] == "delivered"].merge(
        customers, on="customer_id", how="inner", validate="many_to_one"
    )
    facts = (
        items.merge(
            delivered[
                [
                    "order_id",
                    "customer_unique_id",
                    "customer_state",
                    "order_purchase_timestamp",
                    "order_delivered_customer_date",
                    "order_estimated_delivery_date",
                ]
            ],
            on="order_id",
            how="inner",
            validate="many_to_one",
        )
        .merge(products[["product_id", "category"]], on="product_id", how="left")
        .merge(sellers[["seller_id", "seller_state"]], on="seller_id", how="left")
        .merge(reviews, on="order_id", how="left")
    )
    facts["category"] = facts["category"].fillna("unknown")
    return {"orders": delivered, "facts": facts, "reviews": reviews}


def period_facts(facts: pd.DataFrame, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    return facts.loc[
        (facts["order_purchase_timestamp"] >= start)
        & (facts["order_purchase_timestamp"] < end)
    ].copy()


def kpis(facts: pd.DataFrame, reviews: pd.DataFrame) -> dict[str, float | int]:
    orders = facts["order_id"].nunique()
    revenue = float(facts["price"].sum())
    unique_customers = facts["customer_unique_id"].nunique()
    order_ids = facts["order_id"].drop_duplicates()
    average_review = reviews.loc[reviews["order_id"].isin(order_ids), "review_score"].mean()
    return {
        "revenue": round(revenue, 2),
        "orders": int(orders),
        "averageOrderValue": round(revenue / orders, 2) if orders else 0,
        "customers": int(unique_customers),
        "averageReviewScore": round(float(average_review), 2),
    }


def metric_set(current: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    return {
        key: {
            "value": value,
            "previousValue": previous[key],
            "changePct": pct_change(float(value), float(previous[key])),
        }
        for key, value in current.items()
    }


def monthly_revenue(facts: pd.DataFrame) -> list[dict[str, Any]]:
    working = facts.assign(month=facts["order_purchase_timestamp"].dt.to_period("M").dt.to_timestamp())
    monthly = (
        working.groupby("month", as_index=False)
        .agg(revenue=("price", "sum"), orders=("order_id", "nunique"))
        .sort_values("month")
    )
    monthly["monthOverMonthPct"] = monthly["revenue"].pct_change(fill_method=None).mul(100).round(2)
    monthly["cumulativeRevenue"] = monthly["revenue"].cumsum()
    monthly["revenueMovingAverage3m"] = monthly["revenue"].rolling(3, min_periods=1).mean()
    return [
        {
            "month": row.month.date().isoformat(),
            "revenue": round(float(row.revenue), 2),
            "orders": int(row.orders),
            "monthOverMonthPct": clean(row.monthOverMonthPct),
            "cumulativeRevenue": round(float(row.cumulativeRevenue), 2),
            "revenueMovingAverage3m": round(float(row.revenueMovingAverage3m), 2),
        }
        for row in monthly.itertuples()
    ]


def category_performance(facts: pd.DataFrame) -> list[dict[str, Any]]:
    categories = (
        facts.groupby("category", as_index=False)
        .agg(
            revenue=("price", "sum"),
            orders=("order_id", "nunique"),
            items=("order_id", "size"),
            averageReviewScore=("review_score", "mean"),
        )
        .sort_values("revenue", ascending=False)
    )
    total = categories["revenue"].sum()
    return [
        {
            "category": row.category,
            "revenue": round(float(row.revenue), 2),
            "orders": int(row.orders),
            "items": int(row.items),
            "averageReviewScore": round(float(row.averageReviewScore), 2),
            "revenueRank": rank,
            "revenueSharePct": round(float(row.revenue) * 100 / total, 2),
        }
        for rank, row in enumerate(categories.itertuples(), start=1)
    ]


def customer_behavior(facts: pd.DataFrame) -> dict[str, Any]:
    order_values = (
        facts.groupby(
            ["customer_unique_id", "order_id", "order_purchase_timestamp"], as_index=False
        )["price"]
        .sum()
        .sort_values(["customer_unique_id", "order_purchase_timestamp"])
    )
    order_values["previous"] = order_values.groupby("customer_unique_id")[
        "order_purchase_timestamp"
    ].shift()
    order_values["daysBetween"] = (
        order_values["order_purchase_timestamp"] - order_values["previous"]
    ).dt.total_seconds() / 86400
    customers = order_values.groupby("customer_unique_id").agg(
        purchaseCount=("order_id", "size"),
        lifetimeValue=("price", "sum"),
        averageDaysBetween=("daysBetween", "mean"),
    )
    repeat = int((customers["purchaseCount"] > 1).sum())
    return {
        "customers": int(len(customers)),
        "repeatCustomers": repeat,
        "repeatCustomerRatePct": round(repeat * 100 / len(customers), 2),
        "averageDaysBetweenPurchases": clean(round(customers["averageDaysBetween"].mean(), 2)),
        "highValueCustomers": int((customers["lifetimeValue"] >= 500).sum()),
    }


def delivery_impact(facts: pd.DataFrame) -> list[dict[str, Any]]:
    orders = facts.drop_duplicates("order_id").copy()
    orders = orders.loc[orders["order_delivered_customer_date"].notna()]
    orders["deliveryStatus"] = "on_time"
    orders.loc[
        orders["order_delivered_customer_date"] > orders["order_estimated_delivery_date"],
        "deliveryStatus",
    ] = "late"
    orders["deliveryDays"] = (
        orders["order_delivered_customer_date"] - orders["order_purchase_timestamp"]
    ).dt.total_seconds() / 86400
    grouped = orders.groupby("deliveryStatus", as_index=False).agg(
        orders=("order_id", "nunique"),
        averageDeliveryDays=("deliveryDays", "mean"),
        averageReviewScore=("review_score", "mean"),
    )
    total = grouped["orders"].sum()
    return [
        {
            "deliveryStatus": row.deliveryStatus,
            "orders": int(row.orders),
            "averageDeliveryDays": round(float(row.averageDeliveryDays), 2),
            "averageReviewScore": round(float(row.averageReviewScore), 2),
            "orderSharePct": round(int(row.orders) * 100 / total, 2),
        }
        for row in grouped.itertuples()
    ]


def seller_performance(facts: pd.DataFrame) -> list[dict[str, Any]]:
    grouped = (
        facts.groupby(["seller_id", "seller_state"], as_index=False)
        .agg(
            revenue=("price", "sum"),
            orders=("order_id", "nunique"),
            averageReviewScore=("review_score", "mean"),
        )
        .sort_values("revenue", ascending=False)
        .head(50)
    )
    return [
        {
            "sellerLabel": f"Seller {rank:02d}",
            "state": row.seller_state,
            "revenue": round(float(row.revenue), 2),
            "orders": int(row.orders),
            "averageOrderValue": round(float(row.revenue) / int(row.orders), 2),
            "averageReviewScore": round(float(row.averageReviewScore), 2),
            "revenueRank": rank,
        }
        for rank, row in enumerate(grouped.itertuples(), start=1)
    ]


def cohort_retention(all_facts: pd.DataFrame, end: pd.Timestamp) -> list[dict[str, Any]]:
    activity = all_facts.loc[all_facts["order_purchase_timestamp"] < end, [
        "customer_unique_id", "order_purchase_timestamp"
    ]].drop_duplicates()
    activity["activityMonth"] = activity["order_purchase_timestamp"].dt.to_period("M")
    activity = activity.drop_duplicates(["customer_unique_id", "activityMonth"])
    activity["cohortMonth"] = activity.groupby("customer_unique_id")["activityMonth"].transform("min")
    activity["monthNumber"] = (
        activity["activityMonth"].astype("int64") - activity["cohortMonth"].astype("int64")
    )
    grouped = activity.groupby(["cohortMonth", "monthNumber"], as_index=False).agg(
        activeCustomers=("customer_unique_id", "nunique")
    )
    sizes = grouped.loc[grouped["monthNumber"] == 0, ["cohortMonth", "activeCustomers"]].rename(
        columns={"activeCustomers": "cohortSize"}
    )
    grouped = grouped.merge(sizes, on="cohortMonth")
    grouped = grouped.loc[
        (grouped["cohortMonth"] >= pd.Period("2017-01", freq="M"))
        & (grouped["monthNumber"] <= 11)
    ]
    return [
        {
            "cohortMonth": str(row.cohortMonth),
            "monthNumber": int(row.monthNumber),
            "cohortSize": int(row.cohortSize),
            "activeCustomers": int(row.activeCustomers),
            "retentionRatePct": round(int(row.activeCustomers) * 100 / int(row.cohortSize), 2),
        }
        for row in grouped.itertuples()
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a privacy-safe aggregate snapshot from Olist")
    parser.add_argument("--data-dir", type=Path, default=Path("data/raw"))
    parser.add_argument(
        "--output", type=Path, default=Path("frontend/public/data/analytics.json")
    )
    arguments = parser.parse_args()
    start = pd.Timestamp("2017-09-01")
    end = pd.Timestamp("2018-09-01")
    previous_start = pd.Timestamp("2016-09-01")
    sources = load_sources(arguments.data_dir)
    current_facts = period_facts(sources["facts"], start, end)
    previous_facts = period_facts(sources["facts"], previous_start, start)
    snapshot = {
        "source": {
            "name": "Brazilian E-Commerce Public Dataset by Olist",
            "license": "CC BY-NC-SA 4.0",
            "datasetUrl": "https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce",
            "generatedFromRawData": True,
        },
        "periodStart": start.date().isoformat(),
        "periodEnd": date(2018, 8, 31).isoformat(),
        "kpis": metric_set(
            kpis(current_facts, sources["reviews"]),
            kpis(previous_facts, sources["reviews"]),
        ),
        "revenueTrend": monthly_revenue(current_facts),
        "categories": category_performance(current_facts),
        "customerBehavior": customer_behavior(current_facts),
        "deliveryImpact": delivery_impact(current_facts),
        "sellers": seller_performance(current_facts),
        "retention": cohort_retention(sources["facts"], end),
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(clean(snapshot), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote aggregate snapshot to {arguments.output.resolve()}")


if __name__ == "__main__":
    main()
