import type { Locale } from '../../site.config';
import en from './en.json';
import es from './es.json';

type TranslationKey = keyof typeof en;

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  es,
};

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale][key] ?? translations.en[key] ?? key;
}

export type { TranslationKey };
