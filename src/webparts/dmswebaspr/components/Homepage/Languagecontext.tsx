import * as React from "react";

export type LanguageType = "en" | "ar";

interface ILanguageContext {
  isArabic: boolean;
  lang: LanguageType;
  toggleLanguage: () => void;
}

export const LanguageContext = React.createContext<ILanguageContext>({
  isArabic: false,
  lang: "en",
  toggleLanguage: () => {}
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isArabic, setIsArabic] = React.useState(false);
  const [language, setLanguage] = React.useState<LanguageType>("en");

  const toggleLanguage = () => {
    setIsArabic(prev => !prev);
    setLanguage(prev => (prev === "en" ? "ar" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ isArabic, lang: language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
