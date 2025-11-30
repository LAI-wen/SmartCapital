import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW';
import enUS from './locales/en-US';

// 從 localStorage 獲取語言設定，預設為繁體中文
const savedLanguage = localStorage.getItem('language') || 'zh-TW';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': {
        translation: zhTW,
      },
      'en-US': {
        translation: enUS,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
