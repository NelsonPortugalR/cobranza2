import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site.ts";

// Mientras el sitio no sea público (SITE_INDEXABLE != "true"), se bloquea todo.
// En público: se permite a buscadores y a los rastreadores de IA (ChatGPT, Claude,
// Perplexity, Gemini…) para que puedan citar el catálogo y las guías.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "Amazonbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  if (!SITE.indexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: ["/api/"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
