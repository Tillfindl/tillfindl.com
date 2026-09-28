/*
 * Structured data (schema.org JSON-LD) describing Till, built from profile.ts.
 * Search engines and AI assistants read this to answer "who is Till Findl?" correctly.
 */
import { bounceback, education, eigen, links, person, SITE_URL, type Lang } from './profile';

export function personJsonLd(lang: Lang, imageUrl: string) {
  const sameAs = [links.linkedin, links.bounceback, links.eigen].filter(Boolean);
  const org = (v: typeof bounceback, city: string, country: string) => ({
    '@type': 'Organization',
    name: v.legalName,
    url: v.url,
    address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: country },
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: lang === 'en' ? `${SITE_URL}/` : `${SITE_URL}/de/`,
    inLanguage: lang,
    mainEntity: {
      '@type': 'Person',
      '@id': `${SITE_URL}/#till`,
      name: person.name,
      givenName: person.givenName,
      familyName: person.familyName,
      url: `${SITE_URL}/`,
      image: imageUrl,
      description: person.summary[lang],
      jobTitle: [bounceback.role[lang], eigen.role[lang]],
      worksFor: [org(bounceback, 'Vienna', 'AT'), org(eigen, 'Zurich', 'CH')],
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'University College London', url: 'https://www.ucl.ac.uk' },
        { '@type': 'EducationalOrganization', name: 'Vienna International School' },
      ],
      hasCredential: education.map((e) => ({
        '@type': 'EducationalOccupationalCredential',
        name: e.degree,
        recognizedBy: { '@type': 'Organization', name: e.name },
      })),
      knowsLanguage: ['de', 'en', 'es'],
      knowsAbout: [
        'Medicine',
        'Physiotherapy software',
        'Digital health',
        'Biomechanics',
        'Gait analysis',
        'Computer vision',
        'Product design',
      ],
      homeLocation: [
        { '@type': 'City', name: 'Vienna', address: { '@type': 'PostalAddress', addressCountry: 'AT' } },
        { '@type': 'City', name: 'London', address: { '@type': 'PostalAddress', addressCountry: 'GB' } },
      ],
      sameAs,
    },
  };
}
