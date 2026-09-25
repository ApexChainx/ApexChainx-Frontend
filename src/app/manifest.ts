import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { locales, defaultLocale, localeNames } from "@/i18n/config";

async function getLocaleFromCookie(): Promise<string> {
  const cookieStore = await headers();
  const localeCookie = cookieStore.get("preferred-locale");
  if (localeCookie && locales.includes(localeCookie as any)) {
    return localeCookie;
  }
  return defaultLocale;
}

function getManifestStrings(locale: string) {
  const isEnglish = locale === "en";
  
  if (isEnglish) {
    return {
      name: "ApexChain — Network Operations Intelligence",
      short_name: "ApexChain",
      description: "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments.",
      lang: "en-US",
    };
  }
  
  if (locale === "es") {
    return {
      name: "ApexChain — Inteligencia de Operaciones de Red",
      short_name: "ApexChain",
      description: "Plataforma de inteligencia de operaciones de red empresarial. Gestión de interrupciones en tiempo real, cumplimiento de SLA y pagos automatizados en blockchain.",
      lang: "es-ES",
    };
  }
  
  // Portuguese
  return {
    name: "ApexChain — Inteligência de Operações de Rede",
    short_name: "ApexChain",
    description: "Plataforma de inteligência de operações de rede empresarial. Gestão de interrupções em tempo real, aplicação de SLA e pagamentos automatizados em blockchain.",
    lang: "pt-BR",
  };
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocaleFromCookie();
  const strings = getManifestStrings(locale);
  
  return {
    name: strings.name,
    short_name: strings.short_name,
    description: strings.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#4F46E5",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "utilities"],
    lang: strings.lang,
    dir: "ltr",
    scope: "/",
    id: "apexchain",
  };
}
