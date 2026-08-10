"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale-provider";

export default function NotFound() {
  const { message } = useLocale();
  return <div className="state-panel"><h1>404</h1><p>{message.common.notFoundBody}</p><Link className="button primary" href="/">{message.common.backToOverview}</Link></div>;
}
