export const siteConfig = {
  name: 'Aux',
  description: 'Your weekly music club. Share songs, vote favorites, crown the DJ.',
  url: 'https://aux.alvarotc.com',
  author: {
    name: 'Alvaro Torres',
    url: 'https://alvarotc.com',
  },
  github: 'https://github.com/alvarotorresc/aux',
  defaultLocale: 'en' as const,
  locales: ['en', 'es'] as const,
} as const;

export type Locale = (typeof siteConfig.locales)[number];
