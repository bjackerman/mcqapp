export const THEME_STORAGE_KEY = 'mcq_theme_preference_v1';
export const THEME_OPTIONS = ['system', 'light', 'dark'];

export let themePreference = 'system';
export let resolvedTheme = 'light';

let mediaQuery = null;
let initialized = false;

export function initializeThemePreference() {
  if (!isBrowser()) return;

  themePreference = normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  resolvedTheme = resolveTheme(themePreference);
  applyTheme(resolvedTheme);

  if (!initialized) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    initialized = true;
  }
}

export function setThemePreference(value) {
  themePreference = normalizeThemePreference(value);
  resolvedTheme = resolveTheme(themePreference);

  if (isBrowser()) {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }

  applyTheme(resolvedTheme);
  return resolvedTheme;
}

export function getThemeLabel(value) {
  if (value === 'dark') return 'Dark';
  if (value === 'light') return 'Light';
  return 'System';
}

function handleSystemThemeChange() {
  if (themePreference !== 'system') return;
  resolvedTheme = resolveTheme(themePreference);
  applyTheme(resolvedTheme);
}

function resolveTheme(value) {
  if (value === 'dark' || value === 'light') return value;
  return mediaQuery?.matches ? 'dark' : 'light';
}

function applyTheme(value) {
  if (!isBrowser()) return;
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
}

function normalizeThemePreference(value) {
  return THEME_OPTIONS.includes(value) ? value : 'system';
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
