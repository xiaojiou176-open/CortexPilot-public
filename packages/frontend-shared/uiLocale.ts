export type UiLocale = "en" | "zh-CN";

export const UI_LOCALE_STORAGE_KEY = "cortexpilot.ui.locale";
export const DEFAULT_UI_LOCALE: UiLocale = "en";

export function normalizeUiLocale(value: string | null | undefined): UiLocale {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function detectPreferredUiLocale(): UiLocale {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (stored) {
      return normalizeUiLocale(stored);
    }
    const [browserLanguage] = Array.isArray(window.navigator.languages)
      ? window.navigator.languages
      : [];
    return normalizeUiLocale(browserLanguage || window.navigator.language);
  }
  return DEFAULT_UI_LOCALE;
}

export function persistPreferredUiLocale(locale: UiLocale): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
}

export function toggleUiLocale(locale: UiLocale): UiLocale {
  return locale === "en" ? "zh-CN" : "en";
}
