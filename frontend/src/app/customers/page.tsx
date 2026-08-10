import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/analytics-page";
export const metadata: Metadata = { title: "Customers" };
export default function Page() { return <AnalyticsPage section="customers" />; }
