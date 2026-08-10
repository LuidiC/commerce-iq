"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";

export function LoadingState() {
  const { message } = useLocale();
  return (
    <div className="loading-state" role="status">
      <div className="loading-head"><span /><span /></div>
      <div className="loading-kpis">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>
      <div className="loading-panels"><span /><span /></div>
      <p>{message.common.loading}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { message } = useLocale();
  return (
    <div className="state-panel" role="alert">
      <AlertCircle size={24} />
      <h2>{message.common.errorTitle}</h2>
      <p>{message.common.errorBody}</p>
      <button className="button secondary" onClick={onRetry}><RotateCcw size={15} />{message.common.retry}</button>
    </div>
  );
}

export function EmptyState() {
  const { message } = useLocale();
  return (
    <div className="state-panel">
      <h2>{message.common.emptyTitle}</h2>
      <p>{message.common.emptyBody}</p>
    </div>
  );
}
