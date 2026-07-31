/**
 * Central site/app config. Read once; avoids scattering magic strings/env reads.
 */
export const siteConfig = {
  name: 'AI Meeting Assistant',
  description: 'Turn meeting recordings into searchable, actionable knowledge.',
  /** Backend API base URL. NEXT_PUBLIC_ prefix exposes it to the browser bundle. */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
} as const;
