import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// /robots.txt: izinkan semua mesin pencari, kecuali endpoint chat (stream SSE
// yang tidak pernah selesai -- tidak ada isinya untuk diindeks, dan crawler
// yang menahannya terbuka cuma memakan kuota koneksi).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
