import { getPortfolio } from '../data/dataStore';
import {
  DEFAULT_LANGUAGE,
  type About,
  type Education,
  type JobExperience,
  type Language,
  type Portfolio,
  type Project,
  type SocialLink,
} from '../types/portfolio';

/**
 * Service layer for portfolio data queries (see architecture:
 * "Service-Layer (Datenabfrage)"). Delegates to the read-only data layer.
 * Every query accepts the desired content language.
 */
export const portfolioService = {
  /** @returns The full aggregated portfolio. */
  getAll: (lang: Language = DEFAULT_LANGUAGE): Portfolio => getPortfolio(lang),

  /** @returns The "about me" / Lebensweg section. */
  getAbout: (lang: Language = DEFAULT_LANGUAGE): About => getPortfolio(lang).about,

  /** @returns All job-experience entries. */
  getExperience: (lang: Language = DEFAULT_LANGUAGE): JobExperience[] => getPortfolio(lang).experience,

  /** @returns All education entries. */
  getEducation: (lang: Language = DEFAULT_LANGUAGE): Education[] => getPortfolio(lang).education,

  /** @returns All project entries. */
  getProjects: (lang: Language = DEFAULT_LANGUAGE): Project[] => getPortfolio(lang).projects,

  /** @returns The social-media links. */
  getSocial: (lang: Language = DEFAULT_LANGUAGE): SocialLink[] => getPortfolio(lang).social,
};
