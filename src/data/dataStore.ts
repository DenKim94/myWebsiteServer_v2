import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../config/logger';
import { DATA_DIR } from './paths';
import { sanitizeJsonText } from './sanitizeJson';
import {
  DEFAULT_LANGUAGE,
  type About,
  type Education,
  type JobExperience,
  type Language,
  type Portfolio,
  type Project,
  type RawDatabase,
  type SocialLink,
} from '../types/portfolio';

/**
 * Static mapping of the raw `PROJECT_DESCRIPTION_<KEY>` entries to a stable
 * project id, a per-language display title, the matching URL key and the logo
 * file name. These attributes are language-independent identifiers; the display
 * title is provided per language (most project names are proper nouns and are
 * identical in every language). Content (description, effort, tech stack) is
 * taken verbatim from the DB.
 */
const PROJECT_MAP: Record<
  string,
  { id: string; title: Record<Language, string>; urlKey: string; logo: string }
> = {
  PROJECT_DESCRIPTION_STRATEGO: { id: 'stratego', title: { de: 'Stratego', en: 'Stratego' }, urlKey: 'stratego', logo: 'strategoLogo.png' },
  PROJECT_DESCRIPTION_ECA: { id: 'eca', title: { de: 'ECA', en: 'ECA' }, urlKey: 'eca', logo: 'ecaLogo.png' },
  PROJECT_DESCRIPTION_ECO: { id: 'eco', title: { de: 'ECO', en: 'ECO' }, urlKey: 'eco', logo: 'eco_app_v2.png' },
  PROJECT_DESCRIPTION_WEBSITE: { id: 'website', title: { de: 'Portfolio-Webseite', en: 'Portfolio Website' }, urlKey: 'website', logo: 'myWebLogo.ico' },
  PROJECT_DESCRIPTION_TRAVELBLOG: { id: 'travelblog', title: { de: 'Travel-Blog', en: 'Travel-Blog' }, urlKey: 'travelblog', logo: 'travelBlogLogo.png' },
};

/** Image file names used by the "about me" / Lebensweg section. */
const ABOUT_IMAGES = [
  'IMG_LEBENSWEG_01.png',
  'IMG_LEBENSWEG_02.png',
  'IMG_LEBENSWEG_03.png',
  'IMG_LEBENSWEG_04.jpeg',
];

/** In-memory cache of the normalized portfolio, keyed by language (lazy). */
const cachedPortfolios = new Map<Language, Portfolio>();

/**
 * Builds the host + example database file names for a given language.
 * German (the default) uses the unsuffixed `database.json`; other languages
 * use a `database.<lang>.json` suffix.
 * @param lang Content language.
 */
function databaseFileNames(lang: Language): { real: string; example: string } {
  return lang === DEFAULT_LANGUAGE
    ? { real: 'database.json', example: 'database.example.json' }
    : { real: `database.${lang}.json`, example: `database.${lang}.example.json` };
}

/**
 * Ordered list of candidate database paths for a language: the host-provided
 * file first, then the bundled example, then (for non-default languages) the
 * default-language files as a graceful fallback so the API never breaks when a
 * translation file has not been provided yet.
 * @param lang Content language.
 */
function databaseCandidates(lang: Language): string[] {
  const own = databaseFileNames(lang);
  const paths = [path.join(DATA_DIR, own.real), path.join(DATA_DIR, own.example)];
  if (lang !== DEFAULT_LANGUAGE) {
    const fallback = databaseFileNames(DEFAULT_LANGUAGE);
    paths.push(path.join(DATA_DIR, fallback.real), path.join(DATA_DIR, fallback.example));
  }
  return paths;
}

/**
 * Locates and reads the raw database file for the requested language. Prefers
 * the host-provided file, falls back to the bundled example, and finally to the
 * default language.
 * @param lang Content language.
 * @returns Parsed raw database object.
 */
function readRawDatabase(lang: Language): RawDatabase {
  const candidates = databaseCandidates(lang);
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!filePath) {
    logger.error(`No database file found in ${DATA_DIR} for "${lang}". Returning empty dataset.`);
    return {};
  }

  if (path.basename(filePath).includes('.example.')) {
    logger.warn(`Using ${path.basename(filePath)} (host database not found).`);
  }
  if (lang !== DEFAULT_LANGUAGE && !path.basename(filePath).includes(`.${lang}.`)) {
    logger.warn(`No "${lang}" database found — falling back to the default language.`);
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
  lang: Language,
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
    title: meta.title[lang],
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
 * Loads and normalizes the raw database into the API model for a language.
 * The result is cached in memory per language. The data layer treats the
 * database as read-only.
 * @param lang Content language (defaults to {@link DEFAULT_LANGUAGE}).
 * @returns Fully normalized {@link Portfolio}.
 */
export function getPortfolio(lang: Language = DEFAULT_LANGUAGE): Portfolio {
  const cached = cachedPortfolios.get(lang);
  if (cached) return cached;

  const db = readRawDatabase(lang);
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
    .map((key) => normalizeProject(key, db[key] as string[], urls, lang));

  const about: About = {
    text: db.INFO_TEXT_LEBENSWEG?.text ?? '',
    images: ABOUT_IMAGES,
  };

  const social: SocialLink[] = (db.SOCIAL_MEDIA_ITEMS ?? []).map((item) => ({
    url: item.URL,
    logo: item.LOGO,
  }));

  const portfolio: Portfolio = { about, experience, education, projects, social };
  cachedPortfolios.set(lang, portfolio);
  logger.info(
    `Portfolio (${lang}) loaded: ${experience.length} jobs, ${education.length} education, ${projects.length} projects.`,
  );
  return portfolio;
}

/** Clears the in-memory cache (useful for tests / hot data reloads). */
export function clearCache(): void {
  cachedPortfolios.clear();
}
