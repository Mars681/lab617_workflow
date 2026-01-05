import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { zh } from './locales/zh';
import { fr } from './locales/fr';
import { ar } from './locales/ar';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  fr: { translation: fr },
  ar: { translation: ar }
};

// Handle ESM default export inconsistencies (common in non-bundled environments like esm.sh)
// @ts-ignore
const i18n = i18next.default || i18next;
// @ts-ignore
const initReact = initReactI18next.default || initReactI18next;

// Get default language from environment variable, default to 'zh' if not set
// @ts-ignore
const defaultLang = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_DEFAULT_LANG) || 'zh';

i18n
  .use(initReact)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
