import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/analytics-page";
export const metadata: Metadata = { title: "Retention" };
export default function Page() { return <AnalyticsPage section="retention" />; }
