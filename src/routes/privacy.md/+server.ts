import { raw } from "#lib/app/legal.ts";
// Served live, not prerendered: a static .md would go out as text/markdown, which some browsers download instead of showing.
export const prerender = false;

export const GET = () => new Response(raw("privacy"), { headers: { "content-type": "text/plain; charset=utf-8" } });
