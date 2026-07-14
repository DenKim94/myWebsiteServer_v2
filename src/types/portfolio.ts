/**
 * Domain types for the portfolio data.
 *
 * `Raw*` types describe the shape of the host-provided `database.json`.
 * The remaining types describe the normalized model that is exposed by the
 * REST API (produced by the data layer / "Datenaufbereitung").
 */

/** Supported content languages. `de` is the default / fallback language. */
export type Language = 'de' | 'en';

/** All supported languages in resolution order. */
export const SUPPORTED_LANGUAGES: readonly Language[] = ['de', 'en'] as const;

/** Default language used when none is requested or an unknown one is given. */
export const DEFAULT_LANGUAGE: Language = 'de';

/**
 * Narrows an arbitrary value to a supported {@link Language}.
 * @param value Candidate language string (e.g. from a query parameter).
 * @returns The matching language or {@link DEFAULT_LANGUAGE} as a fallback.
 */
export function toLanguage(value: unknown): Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
    ? (value as Language)
    : DEFAULT_LANGUAGE;
}

/** Raw job-experience entry as stored in the host database. */
export interface RawJobExperience {
  jobTitle: string;
  company: string;
  url: string;
  location: string;
  timePeriod: string;
  duties: string[];
}

/** Raw education entry as stored in the host database. */
export interface RawEducation {
  institution: string;
  description: string;
  timePeriod: string;
  duties: string[];
}

/** Raw structure of the host-provided `database.json`. */
export interface RawDatabase {
  JOB_EXPERIENCE_CONTENT?: RawJobExperience[];
  EDUCATION_CONTENT?: RawEducation[];
  PROJECT_URLS?: Record<string, string>;
  INFO_TEXT_LEBENSWEG?: { text: string };
  SOCIAL_MEDIA_ITEMS?: Array<{ URL: string; LOGO: string }>;
  /** Project descriptions are keyed as PROJECT_DESCRIPTION_<NAME> and hold an array of text lines. */
  [key: string]: unknown;
}

/** Normalized job-experience entry exposed by the API. */
export interface JobExperience {
  jobTitle: string;
  company: string;
  url: string;
  location: string;
  timePeriod: string;
  duties: string[];
}

/** Normalized education entry exposed by the API. */
export interface Education {
  institution: string;
  description: string;
  timePeriod: string;
  duties: string[];
}

/** Normalized project entry exposed by the API. */
export interface Project {
  id: string;
  title: string;
  description: string;
  effort: string;
  techStack: string[];
  url: string;
  /** File name of the logo/icon inside the data `images`/`icons` folder. */
  logo: string;
  /** Any additional description lines that could not be mapped to a known field. */
  notes: string[];
}

/** Normalized "about me" / Lebensweg section. */
export interface About {
  text: string;
  images: string[];
}

/** Normalized social-media link. */
export interface SocialLink {
  url: string;
  logo: string;
}

/** Aggregated portfolio payload returned by GET /api/portfolio. */
export interface Portfolio {
  about: About;
  experience: JobExperience[];
  education: Education[];
  projects: Project[];
  social: SocialLink[];
  /**
   * Content-version token per servable image file name (derived from the file's
   * size + mtime). The client appends it to the image URL as a `?v=` cache-buster
   * so a changed image is fetched fresh even though images are served with a
   * long-lived, immutable `Cache-Control`.
   */
  imageVersions: Record<string, string>;
}
