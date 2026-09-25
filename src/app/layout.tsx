import { ReactNode } from "react";
/** ApexChain Network Operations Intelligence Platform */
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";
import CommandPalette from "@/components/CommandPalette";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/i18n/i18n";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { env } from "@/lib/config/env";
import "@/lib/register-sw";
import { ReactQueryProvider } from "@/providers/react-query";
import { SessionProvider } from "@/providers/session";
import { headers } from "next/headers";
import { locales, localeNames, defaultLocale } from "@/i18n/config";
import "./globals.css";

interface MetadataProps {
  params: Promise<{}>;
}

async function getLocaleFromCookie(): Promise<string> {
  const cookieStore = await headers();
  const localeCookie = cookieStore.get("preferred-locale");
  if (localeCookie && locales.includes(localeCookie as any)) {
    return localeCookie;
  }
  return defaultLocale;
}

export async function generateMetadata({ params }: MetadataProps) {
  const locale = await getLocaleFromCookie();
  const localeName = localeNames[locale as keyof typeof localeNames] || "English";
  const isEnglish = locale === "en";

  const titleDefault = isEnglish
    ? "ApexChain — Network Operations Intelligence"
    : locale === "es"
    ? "ApexChain — Inteligencia de Operaciones de Red"
    : "ApexChain — Inteligência de Operações de Rede";

  const description = isEnglish
    ? "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, automated blockchain payments, and advanced analytics."
    : locale === "es"
    ? "Plataforma de inteligencia de operaciones de red empresarial. Gestión de interrupciones en tiempo real, cumplimiento de SLA, pagos automatizados en blockchain y análisis avanzados."
    : "Plataforma de inteligência de operações de rede empresarial. Gestão de interrupções em tempo real, aplicação de SLA, pagamentos automatizados em blockchain e análises avançadas.";

  const ogTitle = isEnglish
    ? "ApexChain — Network Operations Intelligence"
    : locale === "es"
    ? "ApexChain — Inteligencia de Operaciones de Red"
    : "ApexChain — Inteligência de Operações de Rede";

  const ogDescription = isEnglish
    ? "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments."
    : locale === "es"
    ? "Plataforma de inteligencia de operaciones de red empresarial. Gestión de interrupciones en tiempo real, cumplimiento de SLA y pagos automatizados en blockchain."
    : "Plataforma de inteligência de operações de rede empresarial. Gestão de interrupções em tempo real, aplicação de SLA e pagamentos automatizados em blockchain.";

  return {
    title: {
      default: titleDefault,
      template: "%s | ApexChain",
    },
    description,
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
      title: ogTitle,
      description: ogDescription,
      url: env.APP_URL,
      siteName: "ApexChain",
      locale: locale === "en" ? "en_US" : locale === "es" ? "es_ES" : "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
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
}

interface RootLayoutProps {
  children: ReactNode;
}

// The backend may live on a different origin in development, so allow
// `connect-src` to reach it while keeping everything else locked down.
const apiOrigin = env.API_BASE_URL.startsWith("http")
  ? new URL(env.API_BASE_URL).origin
  : null;

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={contentSecurityPolicy}
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
                  <CommandPalette />
                  <OnboardingTour />
                  <OfflineBanner />
                </RouteGuard>
              </I18nProvider>
            </ToastProvider>
          </SessionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
