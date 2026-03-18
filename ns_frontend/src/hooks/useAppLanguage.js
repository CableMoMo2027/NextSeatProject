import { useEffect, useState } from 'react';
import { getSavedLanguage } from '../services/homeCache';

function normalizeLang(lang) {
  return lang === 'th-TH' ? 'th-TH' : 'en-US';
}

export function useAppLanguage(initialLang) {
  const [lang, setLang] = useState(() => normalizeLang(initialLang || getSavedLanguage()));

  useEffect(() => {
    if (!initialLang) return;
    setLang(normalizeLang(initialLang));
  }, [initialLang]);

  useEffect(() => {
    const onLangChanged = (event) => {
      const nextLang = normalizeLang(event?.detail?.lang || getSavedLanguage());
      setLang(nextLang);
    };
    window.addEventListener('nextseat:lang-changed', onLangChanged);
    return () => window.removeEventListener('nextseat:lang-changed', onLangChanged);
  }, []);

  return { lang, isThai: lang === 'th-TH' };
}

export default useAppLanguage;
