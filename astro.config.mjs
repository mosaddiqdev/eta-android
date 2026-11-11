import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// `site` makes canonical and social-preview addresses absolute. It is the live address; set SITE_URL to override it
// (a custom domain, say). Vercel sets neither SITE_URL nor Netlify's URL, so the default has to be here.
const site = process.env.SITE_URL ?? "https://clasheta.vercel.app";

// "file" writes finish.html and village.html instead of finish/index.html. The Android app's local server (Capacitor)
// answers any address without a file extension with the home page, so the pages have to be reachable by file name.
export default defineConfig({ site, integrations: [react()], build: { format: "file" } });
