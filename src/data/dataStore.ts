import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../config/logger';
import { DATA_DIR } from './paths';
import { sanitizeJsonText } from './sanitizeJson';
import type {
  About,
  Education,
  JobExperience,
  Portfolio,
  Project,
  RawDatabase,
  SocialLink,
} from '../types/portfolio';

/**
 * Static mapping of the raw `PROJECT_DESCRIPTION_<KEY>` entries to a stable
 * project id, a display title, the matching URL key and the logo file name.
 * Content (description, effort, tech stack) is taken verbatim from the DB.
 */
const PROJECT_MAP: Record<string, { id: string; title: string; urlKey: string; logo: string }> = {
  PROJECT_DESCRIPTION_STRATEGO: { id: 'stratego', title: 'Stratego', urlKey: 'stratego', logo: 'strategoLogo.png' },
  PROJECT_DESCRIPTION_ECA: { id: 'eca', title: 'ECA', urlKey: 'eca', logo: 'ecaLogo.png' },
  PROJECT_DESCRIPTION_ECO: { id: 'eco', title: 'ECO', urlKey: 'eco', logo: 'eco_app_v2.png' },
  PROJECT_DESCRIPTION_WEBSITE: { id: 'website', title: 'Portfolio-Webseite', urlKey: 'website', logo: 'myWebLogo.ico' },
  PROJECT_DESCRIPTION_TRAVELBLOG: { id: 'travelblog', title: 'Travel-Blog', urlKey: 'travelblog', logo: 'travelBlogLogo.png' },
};

/** Image file names used by the "about me" / Lebensweg section. */
const ABOUT_IMAGES = [
  'IMG_LEBENSWEG_01.png',
  'IMG_LEBENSWEG_02.png',
  'IMG_LEBENSWEG_03.png',
  'IMG_LEBENSWEG_04.jpeg',
];

/** In-memory cache of the normalized portfolio (loaded once, lazily). */
let cachedPortfolio: Portfolio | null = null;

/**
 * Locates and reads the raw database file from the data directory. Prefers the
 * host-provided `database.json` and falls back to `database.example.json`.
 * @returns Parsed raw database object.
 */
function readRawDatabase(): RawDatabase {
  const realPath = path.join(DATA_DIR, 'database.json');
  const examplePath = path.join(DATA_DIR, 'database.example.json');
  const filePath = fs.existsSync(realPath) ? realPath : examplePath;

  if (!fs.existsSync(filePath)) {
    logger.error(`No database file found in ${DATA_DIR}. Returning empty dataset.`);
    return {};
  }

  if (filePath === examplePath) {
    logger.warn('Using database.example.json (host database.json not found).');
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(sanitizeJsonText(raw)) as RawDatabase;
}

/**
 * Extracts the value that follows a known `prefix:` inside a list of text lines.
 * @param lines Description lines of a project.
 * @param prefix Prefix to search for (case-insensitive), e.g. "Beschreibung".
 * @returns The trimmed remainder after the prefix, or an empty string.
 */
function extractLine(lines: string[], prefix: string): string {
  const match = lines.find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  if (!match) return '';
  const separatorIndex = match.indexOf(':');
  return separatorIndex >= 0 ? match.slice(separatorIndex + 1).trim() : match.trim();
}

/**
 * Maps a raw project description (array of text lines) to a normalized Project.
 * The raw content is preserved: unmapped lines are kept in `notes`.
 */
function normalizeProject(
  rawKey: string,
  lines: string[],
  urls: Record<string, string>,
): Project {
  const meta = PROJECT_MAP[rawKey];
  const description = extractLine(lines, 'Beschreibung');
  const effort = extractLine(lines, 'Arbeitsumfang');
  const techStackRaw = extractLine(lines, 'Techstack');
  const knownPrefixes = ['Beschreibung', 'Arbeitsumfang', 'Techstack'];
  const notes = lines.filter(
    (line) => !knownPrefixes.some((prefix) => line.trim().toLowerCase().startsWith(prefix.toLowerCase())),
  );

  return {
    id: meta.id,
    title: meta.title,
    description,
    effort,
    techStack: techStackRaw
      .split(';')
      .map((tool) => tool.trim())
      .filter(Boolean),
    url: urls[meta.urlKey] ?? '',
    logo: meta.logo,
    notes,
  };
}

/**
 * Loads and normalizes the raw database into the API model. The result is
 * cached in memory. The data layer treats the database as read-only.
 * @returns Fully normalized {@link Portfolio}.
 */
export function getPortfolio(): Portfolio {
  if (cachedPortfolio) return cachedPortfolio;

  const db = readRawDatabase();
  const urls = (db.PROJECT_URLS ?? {}) as Record<string, string>;

  const experience: JobExperience[] = (db.JOB_EXPERIENCE_CONTENT ?? []).map((entry) => ({
    jobTitle: entry.jobTitle,
    company: entry.company,
    url: entry.url,
    location: entry.location,
    timePeriod: entry.timePeriod,
    duties: entry.duties ?? [],
  }));

  const education: Education[] = (db.EDUCATION_CONTENT ?? []).map((entry) => ({
    institution: entry.institution,
    description: entry.description,
    timePeriod: entry.timePeriod,
    duties: entry.duties ?? [],
  }));

  const projects: Project[] = Object.keys(PROJECT_MAP)
    .filter((key) => Array.isArray(db[key]))
    .map((key) => normalizeProject(key, db[key] as string[], urls));

  const about: About = {
    text: db.INFO_TEXT_LEBENSWEG?.text ?? '',
    images: ABOUT_IMAGES,
  };

  const social: SocialLink[] = (db.SOCIAL_MEDIA_ITEMS ?? []).map((item) => ({
    url: item.URL,
    logo: item.LOGO,
  }));

  cachedPortfolio = { about, experience, education, projects, social };
  logger.info(
    `Portfolio loaded: ${experience.length} jobs, ${education.length} education, ${projects.length} projects.`,
  );
  return cachedPortfolio;
}

/** Clears the in-memory cache (useful for tests / hot data reloads). */
export function clearCache(): void {
  cachedPortfolio = null;
}
