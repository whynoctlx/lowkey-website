import { defineEnvVars } from "@sveltejs/kit/env";

// The Turso database the download count lives in (shared with Zarobenqo). Optional, so the site builds without it;
// the count endpoint then fails and the download still goes through.
export const variables = defineEnvVars({
  TURSO_DATABASE_URL: { description: "libsql://… URL of the Turso database", schema: (v) => v },
  TURSO_AUTH_TOKEN: { description: "Turso auth token for that database", schema: (v) => v },
});
