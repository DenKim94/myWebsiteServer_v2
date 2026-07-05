import type { Request, Response } from 'express';
import { portfolioService } from '../services/portfolioService';
import { toLanguage, type Language } from '../types/portfolio';

/**
 * Reads and validates the desired content language from the `lang` query
 * parameter (e.g. `?lang=en`), defaulting to the fallback language.
 * @param req Incoming request.
 */
function languageOf(req: Request): Language {
  return toLanguage(req.query.lang);
}

/**
 * Portfolio REST controller. Each handler returns a section of the portfolio
 * as JSON in the requested language (`?lang=de|en`). Errors bubble up to the
 * central error handler via the router's async wrapper.
 */
export const portfolioController = {
  /** @route GET /api/portfolio */
  getAll: (req: Request, res: Response): void => {
    res.json(portfolioService.getAll(languageOf(req)));
  },

  /** @route GET /api/portfolio/about */
  getAbout: (req: Request, res: Response): void => {
    res.json(portfolioService.getAbout(languageOf(req)));
  },

  /** @route GET /api/portfolio/experience */
  getExperience: (req: Request, res: Response): void => {
    res.json(portfolioService.getExperience(languageOf(req)));
  },

  /** @route GET /api/portfolio/education */
  getEducation: (req: Request, res: Response): void => {
    res.json(portfolioService.getEducation(languageOf(req)));
  },

  /** @route GET /api/portfolio/projects */
  getProjects: (req: Request, res: Response): void => {
    res.json(portfolioService.getProjects(languageOf(req)));
  },

  /** @route GET /api/portfolio/social */
  getSocial: (req: Request, res: Response): void => {
    res.json(portfolioService.getSocial(languageOf(req)));
  },
};
