import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getHealth } from '../controllers/healthController';
import { portfolioController } from '../controllers/portfolioController';
import { getImage } from '../controllers/imageController';
import { postContact } from '../controllers/contactController';
import { asyncHandler } from '../middleware/asyncHandler';

/** Rate limiter for the contact endpoint (basic abuse protection). */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
});

/** Application router mounted under `/api`. */
export const apiRouter = Router();

// Health
apiRouter.get('/health', getHealth);

// Portfolio data (Datenabfrage)
apiRouter.get('/portfolio', portfolioController.getAll);
apiRouter.get('/portfolio/about', portfolioController.getAbout);
apiRouter.get('/portfolio/experience', portfolioController.getExperience);
apiRouter.get('/portfolio/education', portfolioController.getEducation);
apiRouter.get('/portfolio/projects', portfolioController.getProjects);
apiRouter.get('/portfolio/social', portfolioController.getSocial);

// Binary assets (images/icons) with caching headers
apiRouter.get('/images/:name', getImage);

// Contact form -> e-mail service (with captcha + rate limit)
apiRouter.post('/contact', contactLimiter, asyncHandler(postContact));
