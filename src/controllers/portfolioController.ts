import type { Request, Response } from 'express';
import { portfolioService } from '../services/portfolioService';

/**
 * Portfolio REST controller. Each handler returns a section of the portfolio
 * as JSON. Errors bubble up to the central error handler via the router's
 * async wrapper.
 */
export const portfolioController = {
  /** @route GET /api/portfolio */
  getAll: (_req: Request, res: Response): void => {
    res.json(portfolioService.getAll());
  },

  /** @route GET /api/portfolio/about */
  getAbout: (_req: Request, res: Response): void => {
    res.json(portfolioService.getAbout());
  },

  /** @route GET /api/portfolio/experience */
  getExperience: (_req: Request, res: Response): void => {
    res.json(portfolioService.getExperience());
  },

  /** @route GET /api/portfolio/education */
  getEducation: (_req: Request, res: Response): void => {
    res.json(portfolioService.getEducation());
  },

  /** @route GET /api/portfolio/projects */
  getProjects: (_req: Request, res: Response): void => {
    res.json(portfolioService.getProjects());
  },

  /** @route GET /api/portfolio/social */
  getSocial: (_req: Request, res: Response): void => {
    res.json(portfolioService.getSocial());
  },
};
