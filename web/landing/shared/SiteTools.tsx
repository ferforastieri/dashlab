import { useEffect, useState } from 'react';

export type Language = 'pt' | 'en';
export type Theme = 'light' | 'dark';

export function useSitePreferences(titles: { pt: string; en: string }) {
  const [language, setLanguage] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    if (localStorage.getItem('dashlab-plus-site-language') === 'en') setLanguage('en');
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'pt-BR';
    document.title = language === 'en' ? titles.en : titles.pt;
    localStorage.setItem('dashlab-plus-site-language', language);
  }, [language, titles.en, titles.pt]);

  function toggleTheme() {
    const next: Theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute('content', next === 'light' ? '#f5f2eb' : '#090d0f');
    localStorage.setItem('dashlab-plus-site-theme', next);
    setTheme(next);
  }

  return {
    language,
    theme,
    text: (pt: string, en: string) => (language === 'pt' ? pt : en),
    toggleLanguage: () => setLanguage((current) => (current === 'pt' ? 'en' : 'pt')),
    toggleTheme,
  };
}

export function SiteTools({
  language,
  theme,
  toggleLanguage,
  toggleTheme,
}: {
  language: Language;
  theme: Theme;
  toggleLanguage: () => void;
  toggleTheme: () => void;
}) {
  const isEnglish = language === 'en';
  return (
    <div className="site-tools" aria-label={isEnglish ? 'Preferences' : 'Preferências'}>
      <button
        type="button"
        title={
          isEnglish
            ? `Enable ${theme === 'light' ? 'dark' : 'light'} mode`
            : `Ativar modo ${theme === 'light' ? 'escuro' : 'claro'}`
        }
        aria-pressed={theme === 'light'}
        aria-label={
          isEnglish
            ? `Enable ${theme === 'light' ? 'dark' : 'light'} mode`
            : `Ativar modo ${theme === 'light' ? 'escuro' : 'claro'}`
        }
        onClick={toggleTheme}
      >
        <span aria-hidden="true">{theme === 'light' ? '☀' : '☾'}</span>
        <b>
          {isEnglish
            ? theme === 'light'
              ? 'Light'
              : 'Dark'
            : theme === 'light'
              ? 'Claro'
              : 'Escuro'}
        </b>
      </button>
      <button
        type="button"
        title={isEnglish ? 'Switch language' : 'Trocar idioma'}
        aria-pressed={isEnglish}
        aria-label={isEnglish ? 'Mudar idioma para português' : 'Switch language to English'}
        onClick={toggleLanguage}
      >
        <b>{isEnglish ? 'PT' : 'EN'}</b>
      </button>
    </div>
  );
}
