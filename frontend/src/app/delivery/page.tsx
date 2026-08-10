import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/analytics-page";
export const metadata: Metadata = { title: "Delivery & reviews" };
export default function Page() { return <AnalyticsPage section="delivery" />; }
