import type { Metadata } from "next";
import "./globals.css";
import "./auth-floral.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const viewport = { themeColor: "#102b52", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "J & M | كل ما تحتاجه في مكان واحد",
  description: "J & M — سوق إلكتروني يجمع المنتجات والمتاجر في تجربة تسوق واحدة.",
  applicationName: "J & M",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "J & M" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body><ServiceWorkerRegister />{children}</body>
    </html>
  );
}
