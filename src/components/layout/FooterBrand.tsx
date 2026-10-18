"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Brand column for the footer (Issue #819 — reusable extraction).
 *
 * Extracted from the footer monolith so any surface can render the brand block
 * on its own — an about page, an error screen, an embed — without copying the
 * markup. The network badge carries the dark-mode colour (#818) so it stays
 * legible against both surfaces.
 */

import { memo } from "react";

import { useI18n } from "@/i18n/i18n";
import type { FooterBrand as FooterBrandConfig } from "@/components/layout/footer-sections";

export interface FooterBrandProps {
  brand: FooterBrandConfig;
  /** `mainnet` or `testnet`; drives both the label and the badge colour. */
  network: "mainnet" | "testnet";
}

export const FooterBrand = memo(function FooterBrand({
  brand,
  network,
}: FooterBrandProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid="footer-brand"
      className="flex min-w-0 flex-col gap-2 md:max-w-xs md:shrink"
    >
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
        {t(brand.nameKey)}
      </p>
      <p className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-400">
        {t(brand.taglineKey)}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span
          // The dot is decorative; the accessible name carries the network so
          // the state is announced instead of skipped as a bare glyph.
          role="img"
          aria-label={t("footer.network", { network })}
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
            // Amber reads as "handle with care" for mainnet; emerald as
            // "safe to test against" for testnet. Both sit above 3:1 against
            // the light and dark footer surfaces.
            network === "mainnet"
              ? "bg-amber-500 dark:bg-amber-400"
              : "bg-emerald-600 dark:bg-emerald-400"
          }`}
        />
        {t("footer.networkLabel")}
      </p>
    </div>
  );
});

export default FooterBrand;