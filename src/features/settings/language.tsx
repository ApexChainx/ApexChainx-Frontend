"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings language module (Issue #615).
 *
 * Owns the language selector: the current locale comes from the shared i18n
 * context and switching it persists the choice (localStorage + cookie via the
 * provider) and updates the document language.
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/i18n";

export function LanguageSettings() {
  const { t, locale, setLocale, locales, localeNames } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{t('settings.languageSettings')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('settings.selectLanguage')}</p>

      <div className="mt-6 max-w-md">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {localeNames[locale]}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            {locales.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => setLocale(loc)}
                className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm ${
                  locale === loc ? "bg-slate-100 font-medium" : ""
                }`}
              >
                {localeNames[loc]}
                {locale === loc && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}

export default LanguageSettings;