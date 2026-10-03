import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سوقنا | كل ما تحتاجه في مكان واحد",
  description: "تسوّق منتجات متنوعة من بائعين ومتاجر محلية في المملكة العربية السعودية.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
