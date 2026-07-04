/**
 * Domain types for the portfolio data.
 *
 * `Raw*` types describe the shape of the host-provided `database.json`.
 * The remaining types describe the normalized model that is exposed by the
 * REST API (produced by the data layer / "Datenaufbereitung").
 */

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
}
