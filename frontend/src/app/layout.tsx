import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/i18n/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CommerceIQ — E-commerce analytics", template: "%s · CommerceIQ" },
  description: "A SQL-first analytics product built on the public Olist e-commerce dataset.",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <LocaleProvider><AppShell>{children}</AppShell></LocaleProvider>
      </body>
    </html>
  );
}
