import { ReactNode } from "react";
/** ApexChain Network Operations Intelligence Platform */
import "./globals.css";
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";
import { ReactQueryProvider } from "@/providers/react-query";
import { SessionProvider } from "@/providers/session";
import { ToastProvider } from "@/components/ui/toast";

export const metadata = {
  title: {
    default: "ApexChain — Network Operations Intelligence",
    template: "%s | ApexChain",
  },
  description:
    "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, automated blockchain payments, and advanced analytics.",
  keywords: [
    "ApexChain",
    "network operations",
    "outage management",
    "SLA",
    "blockchain payments",
    "Stellar",
    "telecom",
  ],
  authors: [{ name: "ApexChain" }],
  creator: "ApexChain",
  publisher: "ApexChain",
  metadataBase: new URL("https://apexchain.com"),
  openGraph: {
    title: "ApexChain — Network Operations Intelligence",
    description:
      "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments.",
    url: "https://apexchain.com",
    siteName: "ApexChain",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApexChain — Network Operations Intelligence",
    description:
      "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <SessionProvider>
            <ToastProvider>
              <RouteGuard>
                <Navigation />
                {children}
              </RouteGuard>
            </ToastProvider>
          </SessionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
