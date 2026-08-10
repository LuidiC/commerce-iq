"use client";
import { ErrorState } from "@/components/states";
export default function Error({ reset }: { reset: () => void }) { return <ErrorState onRetry={reset} />; }
