// Total downloads, kept in Turso. GET reads it; POST counts one per browser: a year-long cookie marks a browser that
// already counted. shortcut: a script that drops cookies can still inflate it, add a per-IP limit if that happens.
import { json } from "@sveltejs/kit";
import { createClient } from "@libsql/client/web";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "$app/env/private";
import type { RequestHandler } from "./$types";

export const prerender = false;

const COOKIE = "lk_dl";
const db = () => createClient({ url: TURSO_DATABASE_URL ?? "", authToken: TURSO_AUTH_TOKEN });
// One row (id 1); the first call makes the table, so the shared database needs no setup.
const CREATE = "CREATE TABLE IF NOT EXISTS lowkey_downloads (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL)";
const total = async (count: boolean) => {
  const [, res] = await db().batch([
    CREATE,
    count
      ? "INSERT INTO lowkey_downloads (id, total) VALUES (1, 1) ON CONFLICT (id) DO UPDATE SET total = total + 1 RETURNING total"
      : "SELECT COALESCE((SELECT total FROM lowkey_downloads WHERE id = 1), 0) AS total",
  ], "write");
  return Number(res.rows[0].total);
};

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({ "cache-control": "public, max-age=60" });
  return json({ total: await total(false) });
};

export const POST: RequestHandler = async ({ cookies }) => {
  if (cookies.get(COOKIE)) return json({ total: await total(false), counted: false });
  const n = await total(true);
  cookies.set(COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "strict" });
  return json({ total: n, counted: true });
};
