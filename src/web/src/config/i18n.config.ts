import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// i18next configuration for the Pre-paid Health Plan Onboarding Portal
const i18nextConfig = {
  // Primary language is Brazilian Portuguese with English fallback
  fallbackLng: 'pt-BR',
  supportedLngs: ['pt-BR', 'en'],

  // Namespace configuration
  defaultNS: 'common',
  ns: ['common'],

  // Enable debug in development only
  debug: process.env.NODE_ENV === 'development',

  // Interpolation settings
  interpolation: {
    escapeValue: false, // React handles escaping
  },

  // Language detection configuration
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'i18nextLng',
    checkWhitelist: true,
  },

  // Backend configuration for loading translations
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    allowMultiLoading: false,
    reloadInterval: 300000, // Reload translations every 5 minutes
    timeout: 5000,
    queryStringParams: { v: process.env.BUILD_ID || '1.0.0' },
  },

  // React-specific configuration
  react: {
    useSuspense: true,
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed',
    transEmptyNodeValue: '',
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
  },

  // Missing key handling
  saveMissing: process.env.NODE_ENV === 'development',
  missingKeyHandler: (lng: string[], ns: string, key: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
    }
  },
};

/**
 * Initializes the i18next instance with WCAG-compliant configuration
 * @returns Promise<typeof i18next> Initialized i18next instance
 */
const initI18n = async (): Promise<typeof i18next> => {
  try {
    await i18next
      .use(HttpBackend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init(i18nextConfig);

    // Add WCAG-compliant language change handler
    i18next.on('languageChanged', (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = ['ar', 'he', 'fa'].includes(lng) ? 'rtl' : 'ltr';
      
      // Announce language change to screen readers
      const announcement = document.getElementById('language-change-announcement');
      if (announcement) {
        announcement.textContent = i18next.t('accessibility.languageChanged', { lng });
      }
    });

    return i18next;
  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw error;
  }
};

export default initI18n;