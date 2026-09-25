import { describe, it, expect } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n key parity", () => {
  const enKeys = getAllKeys(en);
  const esKeys = getAllKeys(es);
  const ptKeys = getAllKeys(pt);

  it("es.json has all keys from en.json", () => {
    const missing = enKeys.filter((k) => !esKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("pt.json has all keys from en.json", () => {
    const missing = enKeys.filter((k) => !ptKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("en.json has all keys from es.json", () => {
    const missing = esKeys.filter((k) => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("en.json has all keys from pt.json", () => {
    const missing = ptKeys.filter((k) => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("all three files have identical key sets", () => {
    expect(enKeys).toEqual(esKeys);
    expect(enKeys).toEqual(ptKeys);
  });
});
