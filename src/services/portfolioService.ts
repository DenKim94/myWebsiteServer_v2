import { getPortfolio } from '../data/dataStore';
import type {
  About,
  Education,
  JobExperience,
  Portfolio,
  Project,
  SocialLink,
} from '../types/portfolio';

/**
 * Service layer for portfolio data queries (see architecture:
 * "Service-Layer (Datenabfrage)"). Delegates to the read-only data layer.
 */
export const portfolioService = {
  /** @returns The full aggregated portfolio. */
  getAll: (): Portfolio => getPortfolio(),

  /** @returns The "about me" / Lebensweg section. */
  getAbout: (): About => getPortfolio().about,

  /** @returns All job-experience entries. */
  getExperience: (): JobExperience[] => getPortfolio().experience,

  /** @returns All education entries. */
  getEducation: (): Education[] => getPortfolio().education,

  /** @returns All project entries. */
  getProjects: (): Project[] => getPortfolio().projects,

  /** @returns The social-media links. */
  getSocial: (): SocialLink[] => getPortfolio().social,
};
