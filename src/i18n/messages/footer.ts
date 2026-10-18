/** ApexChain Network Operations Intelligence Platform */
/**
 * Footer message catalogue (Issue #821).
 *
 * The footer's copy was hardcoded English inside the component, so the entire
 * footer was unreadable to the Spanish- and Portuguese-speaking operators the
 * app already ships locales for. Nothing in the footer went through `t()`,
 * which also meant the repo's `no-hardcoded-jsx-text` lint rule had nothing to
 * protect.
 *
 * ## Why this file exists instead of entries in `messages/en.json`
 *
 * The locale bundles in `src/i18n/messages/*.json` are **corrupt in this
 * checkout** — they are binary blobs, not JSON, and have been since commit
 * `a9de073` ("feat(i18n): localize token balance labels"). They cannot be
 * parsed, edited or imported, which is why every existing test in this repo
 * mocks `@/i18n/i18n` rather than using the real provider.
 *
 * Rather than leave the footer copy untranslatable, it lives here as a
 * well-formed, typed catalogue and is merged into every locale by
 * `I18nProvider`. `t("footer.tagline")` therefore resolves correctly the moment
 * the bundles are restored, and this file is then redundant — but until they
 * are, the footer is genuinely translated in all three locales.
 *
 * ## Keys are nested, not dotted
 *
 * `t()` takes a dotted path (`footer.subscribe.invalid`), so this catalogue is
 * authored as a nested object and flattened at the point of use. Keeping it
 * nested here means `Record<Locale, FooterMessages>` can enforce — at compile
 * time — that all three locales define exactly the same keys. A missing `pt`
 * translation is a type error, not a runtime surprise.
 */

import type { Locale } from "@/i18n/config";

export interface FooterMessages {
  brand: string;
  tagline: string;
  /** Suffix of the network badge, e.g. "Testnet". */
  networkLabel: string;
  /** Accessible name of the network badge. `{network}` is substituted. */
  network: string;
  /** Accessible name of the `contentinfo` landmark. */
  landmark: string;
  /** Visually hidden suffix on external links. */
  opensInNewTab: string;
  /** `{year}` is substituted. */
  copyright: string;
  status: string;
  groups: {
    platform: string;
    operations: string;
    resources: string;
  };
  links: {
    sourceCode: string;
    stellarExplorer: string;
  };
  subscribe: {
    title: string;
    hint: string;
    label: string;
    placeholder: string;
    submit: string;
    submitting: string;
    success: string;
    required: string;
    invalid: string;
  };
}

export const FOOTER_MESSAGES: Record<Locale, FooterMessages> = {
  en: {
    brand: "ApexChain",
    tagline:
      "Enterprise network operations intelligence — real-time outage management, SLA enforcement and automated blockchain payments.",
    networkLabel: "Stellar network",
    network: "Stellar {network}",
    landmark: "Site information",
    opensInNewTab: "opens in a new tab",
    copyright: "© {year} ApexChain. All rights reserved.",
    status: "All systems operational",
    groups: {
      platform: "Platform",
      operations: "Operations",
      resources: "Resources",
    },
    links: {
      sourceCode: "Source code",
      stellarExplorer: "Stellar Explorer",
    },
    subscribe: {
      title: "Status updates",
      hint: "A short email when an incident is opened or resolved. No marketing.",
      label: "Email address",
      placeholder: "operator@company.com",
      submit: "Subscribe",
      submitting: "Subscribing…",
      success: "Subscribed. You will hear from us on the next incident.",
      required: "Enter your email address.",
      invalid: "That does not look like a valid email address.",
    },
  },
  es: {
    brand: "ApexChain",
    tagline:
      "Inteligencia de operaciones de red empresarial: gestión de interrupciones en tiempo real, cumplimiento de SLA y pagos automatizados en blockchain.",
    networkLabel: "Red Stellar",
    network: "Stellar {network}",
    landmark: "Información del sitio",
    opensInNewTab: "se abre en una pestaña nueva",
    copyright: "© {year} ApexChain. Todos los derechos reservados.",
    status: "Todos los sistemas operativos",
    groups: {
      platform: "Plataforma",
      operations: "Operaciones",
      resources: "Recursos",
    },
    links: {
      sourceCode: "Código fuente",
      stellarExplorer: "Explorador de Stellar",
    },
    subscribe: {
      title: "Avisos de estado",
      hint: "Un correo breve cuando se abre o resuelve un incidente. Sin publicidad.",
      label: "Correo electrónico",
      placeholder: "operador@empresa.com",
      submit: "Suscribirse",
      submitting: "Suscribiendo…",
      success: "Suscripción completada. Le avisaremos en el próximo incidente.",
      required: "Introduzca su correo electrónico.",
      invalid: "Ese correo electrónico no parece válido.",
    },
  },
  pt: {
    brand: "ApexChain",
    tagline:
      "Inteligência de operações de rede empresarial: gestão de interrupções em tempo real, aplicação de SLA e pagamentos automatizados em blockchain.",
    networkLabel: "Rede Stellar",
    network: "Stellar {network}",
    landmark: "Informações do site",
    opensInNewTab: "abre numa nova separadora",
    copyright: "© {year} ApexChain. Todos os direitos reservados.",
    status: "Todos os sistemas operacionais",
    groups: {
      platform: "Plataforma",
      operations: "Operações",
      resources: "Recursos",
    },
    links: {
      sourceCode: "Código-fonte",
      stellarExplorer: "Explorador Stellar",
    },
    subscribe: {
      title: "Avisos de estado",
      hint: "Um e-mail breve quando um incidente é aberto ou resolvido. Sem marketing.",
      label: "Endereço de e-mail",
      placeholder: "operador@empresa.com",
      submit: "Subscrever",
      submitting: "A subscrever…",
      success: "Subscrição concluída. Avisaremos no próximo incidente.",
      required: "Introduza o seu endereço de e-mail.",
      invalid: "Esse endereço de e-mail não parece válido.",
    },
  },
};

/**
 * Flatten the nested catalogue into the dotted keys `t()` expects.
 * Exported so the shape can be asserted directly in a unit test.
 */
export function flattenFooterMessages(
  messages: FooterMessages,
  prefix = "footer",
): Record<string, string> {
  const flat: Record<string, string> = {};

  const walk = (node: unknown, path: string): void => {
    if (typeof node === "string") {
      flat[path] = node;
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, `${path}.${key}`);
      }
    }
  };

  walk(messages, prefix);
  return flat;
}

/** All locales flattened, keyed by locale then dotted path. */
export const FLATTENED_FOOTER_MESSAGES: Record<
  Locale,
  Record<string, string>
> = {
  en: flattenFooterMessages(FOOTER_MESSAGES.en),
  es: flattenFooterMessages(FOOTER_MESSAGES.es),
  pt: flattenFooterMessages(FOOTER_MESSAGES.pt),
};