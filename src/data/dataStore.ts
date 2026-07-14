import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../config/logger';
import { DATA_DIR, IMAGES_DIR, ICONS_DIR } from './paths';
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
  PROJECT_DESCRIPTION_WEBSITE_V2: { id: 'website-v2', title: { de: 'Portfolio-Webseite 2.0', en: 'Portfolio Website 2.0' }, urlKey: 'website-v2', logo: 'myWebLogoV2.svg' },
  PROJECT_DESCRIPTION_ECO: { id: 'eco', title: { de: 'ECO', en: 'ECO' }, urlKey: 'eco', logo: 'eco_app_v2.png' },
  PROJECT_DESCRIPTION_TRAVELBLOG: { id: 'travelblog', title: { de: 'Travel-Blog', en: 'Travel-Blog' }, urlKey: 'travelblog', logo: 'travelBlogLogo.png' },
  PROJECT_DESCRIPTION_STRATEGO: { id: 'stratego', title: { de: 'Stratego', en: 'Stratego' }, urlKey: 'stratego', logo: 'strategoLogo.png' },
  PROJECT_DESCRIPTION_WEBSITE: { id: 'website', title: { de: 'Portfolio-Webseite', en: 'Portfolio Website' }, urlKey: 'website', logo: 'myWebLogo.ico' },
  PROJECT_DESCRIPTION_ECA: { id: 'eca', title: { de: 'ECA', en: 'ECA' }, urlKey: 'eca', logo: 'ecaLogo.png' },
};

/**
 * File-name prefix (case-insensitive) of the "about me" / Lebensweg photos.
 * The photos are discovered dynamically from the images directory so the data
 * layer stays backend-driven: when the host provides no images, the client
 * hides the photo slider entirely.
 */
const ABOUT_IMAGE_PREFIX = 'IMG_LEBENSWEG';

/** Accepted file extensions for the Lebensweg photos. */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

/** In-memory cache of the normalized portfolio, keyed by language (lazy). */
const cachedPortfolios = new Map<Language, Portfolio>();

/** Lazily resolved list of discovered about-me image file names. */
let cachedAboutImages: string[] | null = null;

/** Lazily computed content-version token per servable image file name. */
let cachedImageVersions: Record<string, string> | null = null;

/**
 * Directories scanned for image-version tokens, in the same precedence order as
 * the image controller resolves a requested file name (images/ before icons/).
 */
const VERSIONED_IMAGE_DIRS = [IMAGES_DIR, ICONS_DIR];

/**
 * Builds a short, stable content-version token from a file's size and mtime.
 * The token changes whenever either value changes (i.e. the file content was
 * replaced). Pure function — extracted for unit testing.
 * @param sizeBytes File size in bytes.
 * @param mtimeMs Last-modified time in milliseconds since the epoch.
 * @returns Version token, e.g. `"4952b-19f61e94696"`.
 */
export function imageVersionToken(sizeBytes: number, mtimeMs: number): string {
  return `${Math.max(0, Math.floor(sizeBytes)).toString(36)}-${Math.max(0, Math.floor(mtimeMs)).toString(36)}`;
}

/**
 * Computes a short content-version token for every servable image file, keyed by
 * file name. The token is derived from the file's size and mtime, so it changes
 * whenever the file content changes. The client appends it to the image URL as a
 * `?v=` cache-buster: the image itself stays long-lived / immutable in caches,
 * but a replaced file yields a new URL and is therefore fetched fresh.
 *
 * First occurrence wins to mirror the image controller's directory precedence;
 * hidden files (e.g. `.DS_Store`) are skipped. Pure I/O helper — cached in
 * memory and refreshed on {@link clearCache} / process restart (i.e. on deploy).
 * @returns Map of image file name → version token (may be empty).
 */
export function resolveImageVersions(): Record<string, string> {
  if (cachedImageVersions) return cachedImageVersions;

  const versions: Record<string, string> = {};
  for (const dir of VERSIONED_IMAGE_DIRS) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue; // directory missing / unreadable
    }
    for (const name of entries) {
      if (name.startsWith('.') || name in versions) continue; // skip hidden; keep first match
      try {
        const stat = fs.statSync(path.join(dir, name));
        if (!stat.isFile()) continue;
        versions[name] = imageVersionToken(stat.size, stat.mtimeMs);
      } catch {
        // ignore an individual unreadable entry
      }
    }
  }

  cachedImageVersions = versions;
  return versions;
}

/**
 * Filters and orders a list of file names down to the "about me" / Lebensweg
 * photos (by prefix + accepted image extension). Pure function — extracted for
 * unit testing.
 * @param fileNames Raw directory entries.
 * @returns Matching image file names, sorted naturally (may be empty).
 */
export function filterAboutImages(fileNames: string[]): string[] {
  return fileNames
    .filter((name) => {
      const lower = name.toLowerCase();
      return (
        lower.startsWith(ABOUT_IMAGE_PREFIX.toLowerCase()) &&
        IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
      );
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Discovers the "about me" photo file names that are actually present in the
 * images directory (`<DATA_DIR>/images`). Returns an empty array when the
 * directory is missing or contains no matching image files, so the API sends an
 * empty `about.images` list and the client can omit the photo slider.
 * @returns Sorted list of image file names (may be empty).
 */
function resolveAboutImages(): string[] {
  if (cachedAboutImages) return cachedAboutImages;

  let images: string[] = [];
  try {
    images = filterAboutImages(fs.readdirSync(IMAGES_DIR));
  } catch {
    // Directory does not exist / is not readable → no photos available.
    images = [];
  }

  if (images.length === 0) {
    logger.warn(`No Lebensweg images found in ${IMAGES_DIR} — photo slider will be hidden.`);
  }
  cachedAboutImages = images;
  return images;
}

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
    images: resolveAboutImages(),
  };

  const social: SocialLink[] = (db.SOCIAL_MEDIA_ITEMS ?? []).map((item) => ({
    url: item.URL,
    logo: item.LOGO,
  }));

  const portfolio: Portfolio = {
    about,
    experience,
    education,
    projects,
    social,
    imageVersions: resolveImageVersions(),
  };
  cachedPortfolios.set(lang, portfolio);
  logger.info(
    `Portfolio (${lang}) loaded: ${experience.length} jobs, ${education.length} education, ${projects.length} projects.`,
  );
  return portfolio;
}

/** Clears the in-memory cache (useful for tests / hot data reloads). */
export function clearCache(): void {
  cachedPortfolios.clear();
  cachedAboutImages = null;
  cachedImageVersions = null;
}
