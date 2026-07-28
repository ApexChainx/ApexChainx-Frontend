import { ReactNode } from "react";
/** ApexChain Network Operations Intelligence Platform */
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/i18n/i18n";
import { env } from "@/lib/config/env";
import "@/lib/register-sw";
import { ReactQueryProvider } from "@/providers/react-query";
import { SessionProvider } from "@/providers/session";
import "./globals.css";

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
  metadataBase: new URL(env.APP_URL),
  openGraph: {
    title: "ApexChain — Network Operations Intelligence",
    description:
      "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments.",
    url: env.APP_URL,
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
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const stored = localStorage.getItem('theme');
                  if (stored) return stored;
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                const theme = getTheme();
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-blue-600"
        >
          Skip to content
        </a>
        <ReactQueryProvider>
          <SessionProvider>
            <ToastProvider>
              <I18nProvider>
                <RouteGuard>
                  <Navigation />
                  <main id="main-content" role="main">
                    {children}
                  </main>
                </RouteGuard>
              </I18nProvider>
            </ToastProvider>
          </SessionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}