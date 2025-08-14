import React, { createContext, useContext, useState, useCallback } from 'react';
// Phase H: Minimal i18n scaffold

export type Messages = Record<string, string>;
interface I18nContextValue { t: (key:string, vars?:Record<string,string|number>)=>string; lang: string; setLang:(l:string)=>void; }
const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const catalogs: Record<string, Messages> = {
  en: {
    'app.loading': 'Loading application…',
    'toast.action.failed': 'Action sync failed',
    'post.comment.placeholder': 'Add a comment',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.signout': 'Sign out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullname': 'Full Name',
    'auth.accountType': 'Account Type',
  'auth.invalid': 'Invalid credentials',
  'auth.signupFailed': 'Sign up failed',
    'nav.feed': 'Feed',
    'nav.qa': 'Q&A',
    'nav.biz': 'Businesses',
    'nav.profile': 'Profile',
    'cta.getStarted': 'Get started',
    'cta.guestBrowse': 'Guests can browse everything. Sign in to post, react, and comment.',
    'cta.signupSignin': 'Sign up / Sign in',
    'brand.name': 'Burma Town',
  },
  mm: { // Partial demo locale (Burmese)
    'app.loading': 'အပ်အား ဖွင့်နေသည်…',
    'auth.signin': 'ဝင်ရန်',
    'auth.signup': 'စာရင်းသွင်းရန်',
    'auth.signout': 'ထွက်ရန်',
    'nav.feed': 'ဖတ်ရှု',
    'nav.qa': 'မေးမြန်း',
    'nav.biz': 'လုပ်ငန်းများ',
    'nav.profile': 'ပရိုဖိုင်',
    'cta.getStarted': 'စတင်ရန်',
    'cta.guestBrowse': 'ဧည့်သည်များအနေဖြင့် ကြည့်ရှုလို့ရပါသည်။ ဝင်ရောက်မှ ပို့စ်၊ တုံ့ပြန်နိုင်ပါသည်။',
    'cta.signupSignin': 'စာရင်းသွင်း / ဝင်',
    'brand.name': 'ဗမာတောင်း',
  }
};

export const I18nProvider: React.FC<{ children: React.ReactNode; initialLang?: string }> = ({ children, initialLang='en' }) => {
  const [lang, setLang] = useState(initialLang);
  const t = useCallback((key: string, vars?: Record<string,string|number>) => {
    const msg = (catalogs[lang] && catalogs[lang][key]) || catalogs.en[key] || key;
    if(vars) return Object.entries(vars).reduce((acc,[k,v])=> acc.replace(new RegExp('\\{'+k+'\\}','g'), String(v)), msg);
    return msg;
  }, [lang]);
  return <I18nContext.Provider value={{ t, lang, setLang }}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if(!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
