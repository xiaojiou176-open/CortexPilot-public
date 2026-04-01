export const UI_LOCALE_STORAGE_KEY = "cortexpilot.ui.locale";
export const DEFAULT_UI_LOCALE = "en";

export function normalizeUiLocale(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function detectPreferredUiLocale() {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (stored) {
      return normalizeUiLocale(stored);
    }
    const languages = Array.isArray(window.navigator.languages)
      ? window.navigator.languages
      : [];
    return normalizeUiLocale(languages[0] || window.navigator.language);
  }
  return DEFAULT_UI_LOCALE;
}

export function persistPreferredUiLocale(locale) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
}

export function toggleUiLocale(locale) {
  return locale === "en" ? "zh-CN" : "en";
}
