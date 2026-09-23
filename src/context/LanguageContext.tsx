import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SafeStorage } from '../utils/storage';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  isHindi: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General & Navigation
    'app_title': 'WMS Packing & Putaway',
    'language': 'Language',
    'english': 'English',
    'hindi': 'हिंदी (Hindi)',
    'switch_language': 'Display Language',
    'switch_language_desc': 'Toggle app interface language (English / हिंदी)',
    'sign_out': 'Sign Out',
    'sign_out_desc': 'Are you sure you want to end your terminal session?',
    'settings': 'Settings',
    'terminal_settings': 'Terminal Settings',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'done': 'Done',
    'submit': 'Submit',
    'save': 'Save',

    // Hardware Scanner & Receivers
    'hardware_scanner': 'Hardware Scanner',
    'tap_to_focus': 'TAP TO FOCUS',
    'scanner_focused': 'SCANNER FOCUSED',
    'ready_for_scan': 'Ready for laser barcode scan',
    'tap_to_focus_sub': 'Tap to focus scanner',
    'ready_to_scan_sku': '● Scanner Active — Ready to scan SKU...',
    'processing_barcode': 'Processing barcode scan...',
    'scanned': 'SCANNED',
    'revised': 'REVISED',
    'cancelled': 'CANCELLED',
    'binned': 'BINNED',

    // Modules & Tabs
    'wms_packing': 'WMS Packing',
    'putaway': 'Putaway Scanning',
    'container_packing': 'Container Packing',
    'inventory': 'Inventory',
    'operations': 'Operations',
    'register': 'Register',
    'scan': 'Scan',
  },
  hi: {
    // General & Navigation
    'app_title': 'WMS पैकिंग एवं पुटअवे',
    'language': 'भाषा',
    'english': 'English',
    'hindi': 'हिंदी (Hindi)',
    'switch_language': 'भाषा चुनें (Language)',
    'switch_language_desc': 'ऐप की इंटरफेस भाषा बदलें (English / हिंदी)',
    'sign_out': 'साइन आउट',
    'sign_out_desc': 'क्या आप अपना सत्र समाप्त करना चाहते हैं?',
    'settings': 'सेटिंग्स',
    'terminal_settings': 'टर्मिनल सेटिंग्स',
    'cancel': 'रद्द करें',
    'confirm': 'पुष्टि करें',
    'done': 'संपन्न',
    'submit': 'जमा करें',
    'save': 'सहेजें',

    // Hardware Scanner & Receivers
    'hardware_scanner': 'हार्डवेयर स्कैनर',
    'tap_to_focus': 'फ़ोकस के लिए टैप करें',
    'scanner_focused': 'स्कैनर सक्रिय है',
    'ready_for_scan': 'लेजर बारकोड स्कैन के लिए तैयार',
    'tap_to_focus_sub': 'स्कैनर फ़ोकस करने के लिए टैप करें',
    'ready_to_scan_sku': '● स्कैनर सक्रिय — SKU स्कैन करें...',
    'processing_barcode': 'बारकोड प्रोसेस हो रहा है...',
    'scanned': 'स्कैन किया गया',
    'revised': 'संशोधित',
    'cancelled': 'रद्द किया गया',
    'binned': 'बिन में रखा',

    // Modules & Tabs
    'wms_packing': 'WMS पैकिंग',
    'putaway': 'पुटअवे स्कैनिंग',
    'container_packing': 'कंटेनर पैकिंग',
    'inventory': 'इन्वेंटरी',
    'operations': 'ऑपरेशन्स',
    'register': 'पंजीकरण',
    'scan': 'स्कैन',
  },
};

const LANGUAGE_STORAGE_KEY = 'wms_app_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isHindi: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await SafeStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch (e) {
      console.log('Failed to load saved language:', e);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await SafeStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.log('Failed to save language preference:', e);
    }
  };

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isHindi: language === 'hi',
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
