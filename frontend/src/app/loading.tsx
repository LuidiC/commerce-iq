"use client";

import { useLocale } from "@/i18n/locale-provider";

export default function Loading() {
  const { message } = useLocale();
  return <div className="route-loading" aria-label={message.common.loadingLabel}><span /><span /><span /></div>;
}
