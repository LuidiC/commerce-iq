"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { type AppLocale, messages } from "./messages";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  message: (typeof messages)[AppLocale];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<AppLocale>(
    (notify) => {
      window.addEventListener("commerceiq-locale", notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener("commerceiq-locale", notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => {
      const saved = window.localStorage.getItem("commerceiq-locale");
      return saved === "en-US" ? "en-US" : "pt-BR";
    },
    () => "pt-BR"
  );

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const setLocale = (nextLocale: AppLocale) => {
    window.localStorage.setItem("commerceiq-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new Event("commerceiq-locale"));
  };

  const value = useMemo(
    () => ({ locale, setLocale, message: messages[locale] }),
    [locale]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
