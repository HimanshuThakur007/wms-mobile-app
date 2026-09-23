import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SafeStorage } from '../utils/storage';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  isHindi: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (keyOrText: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Headers
    'WMS Packing': 'WMS Packing',
    'Putaway Scanning': 'Putaway Scanning',
    'Container Packing': 'Container Packing',
    'Inventory': 'Inventory',
    'Operations': 'Operations',
    'Dashboard': 'Dashboard',
    'Settings': 'Settings',
    'Terminal Settings': 'Terminal Settings',
    'Sign Out': 'Sign Out',
    'Language': 'Language',
    'English': 'English',
    'Hindi': 'Hindi',
    'Register': 'Register',
    'Scan': 'Scan',
    'Change': 'Change',
    'Back': 'Back',
    'Submit': 'Submit',
    'Save': 'Save',
    'Cancel': 'Cancel',
    'Confirm': 'Confirm',

    // Scanner & Cards
    'Hardware Scanner': 'Hardware Scanner',
    'TAP TO FOCUS': 'TAP TO FOCUS',
    'SCANNER FOCUSED': 'SCANNER FOCUSED',
    'Ready for laser barcode scan': 'Ready for laser barcode scan',
    'Tap to focus scanner': 'Tap to focus scanner',
    '● Scanner Active — Ready to scan SKU...': '● Scanner Active — Ready to scan SKU...',
    'Processing barcode scan...': 'Processing barcode scan...',

    // Cart & Stats
    'Bin Cart Allocation': 'Bin Cart Allocation',
    'TOTAL': 'TOTAL',
    'SCANNED': 'SCANNED',
    'PACKED': 'PACKED',
    'PENDING': 'PENDING',
    'REVISED': 'REVISED',
    'CANCELLED': 'CANCELLED',
    'BINNED': 'BINNED',
    'VOID': 'VOID',
    'ORD': 'ORD',
    'PUT': 'PUT',
    'DIF': 'DIF',
    'STAT': 'STAT',

    // Modals & Forms
    'Duplicate Item': 'Duplicate Item',
    'This item was already scanned': 'This item was already scanned',
    'Edit Quantity': 'Edit Quantity',
    'Cancel Item': 'Cancel Item',
    'Add Duplicate Move': 'Add Duplicate Move',
    'Enter cancellation remarks...': 'Enter cancellation remarks...',
  },
  hi: {
    // Navigation & Headers
    'WMS Packing': 'WMS पैकिंग',
    'Putaway Scanning': 'पुटअवे स्कैनिंग',
    'Container Packing': 'कंटेनर पैकिंग',
    'Inventory': 'इन्वेंटरी',
    'Operations': 'ऑपरेशन्स',
    'Dashboard': 'डैशबोर्ड',
    'Settings': 'सेटिंग्स',
    'Terminal Settings': 'टर्मिनल सेटिंग्स',
    'Sign Out': 'साइन आउट',
    'Language': 'भाषा',
    'English': 'English',
    'Hindi': 'हिंदी',
    'Register': 'पंजीकरण',
    'Scan': 'स्कैन',
    'Change': 'बदलें',
    'Back': 'वापस',
    'Submit': 'जमा करें',
    'Save': 'सहेजें',
    'Cancel': 'रद्द करें',
    'Confirm': 'पुष्टि करें',

    // Scanner & Cards
    'Hardware Scanner': 'हार्डवेयर स्कैनर',
    'TAP TO FOCUS': 'फ़ोकस के लिए टैप करें',
    'SCANNER FOCUSED': 'स्कैनर सक्रिय है',
    'Ready for laser barcode scan': 'लेजर बारकोड स्कैन के लिए तैयार',
    'Tap to focus scanner': 'स्कैनर फ़ोकस करने के लिए टैप करें',
    '● Scanner Active — Ready to scan SKU...': '● स्कैनर सक्रिय — SKU स्कैन करें...',
    'Processing barcode scan...': 'बारकोड प्रोसेस हो रहा है...',

    // Cart & Stats
    'Bin Cart Allocation': 'बिन कार्ट आवंटन',
    'TOTAL': 'कुल',
    'SCANNED': 'स्कैन किया',
    'PACKED': 'पैक्ड',
    'PENDING': 'लंबित',
    'REVISED': 'संशोधित',
    'CANCELLED': 'रद्द किया',
    'BINNED': 'बिन में रखा',
    'VOID': 'रद्द',
    'ORD': 'ऑर्डर',
    'PUT': 'पुट',
    'DIF': 'अंतर',
    'STAT': 'स्थिति',

    // Modals & Forms
    'Duplicate Item': 'डुप्लिकेट आइटम',
    'This item was already scanned': 'यह आइटम पहले ही स्कैन किया जा चुका है',
    'Edit Quantity': 'मात्रा बदलें',
    'Cancel Item': 'आइटम रद्द करें',
    'Add Duplicate Move': 'डुप्लिकेट जोड़ें',
    'Enter cancellation remarks...': 'रद्दीकरण की टिप्पणी लिखें...',

    // Lowercase & Common variation lookups
    'wms packing': 'WMS पैकिंग',
    'putaway scanning': 'पुटअवे स्कैनिंग',
    'container packing': 'कंटेनर पैकिंग',
    'inventory': 'इन्वेंटरी',
    'operations': 'ऑपरेशन्स',
    'dashboard': 'डैशबोर्ड',
    'settings': 'सेटिंग्स',
    'sign out': 'साइन आउट',
    'register': 'पंजीकरण',
    'scan': 'स्कैन',
    'change': 'बदलें',
    'back': 'वापस',
    'total': 'कुल',
    'scanned': 'स्कैन किया',
    'packed': 'पैक्ड',
    'pending': 'लंबित',
    'revised': 'संशोधित',
    'cancelled': 'रद्द किया',
  },
};

const LANGUAGE_STORAGE_KEY = 'wms_app_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isHindi: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (keyOrText: string, fallback?: string) => fallback || keyOrText,
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

  const t = (keyOrText: string, fallback?: string): string => {
    if (!keyOrText) return '';
    if (language === 'en') {
      return fallback || keyOrText;
    }

    const clean = keyOrText.trim();
    const dict = translations.hi;
    if (dict[clean]) return dict[clean];
    if (dict[clean.toLowerCase()]) return dict[clean.toLowerCase()];

    return fallback || keyOrText;
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
