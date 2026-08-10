import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/analytics-page";
export const metadata: Metadata = { title: "Sales" };
export default function Page() { return <AnalyticsPage section="sales" />; }
