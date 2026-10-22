import type { MetadataRoute } from "next";
import { CONFIG } from "@/lib/config";

// /robots.txt: izinkan semua mesin pencari, kecuali endpoint chat (stream SSE
// yang tidak pernah selesai -- tidak ada isinya untuk diindeks, dan crawler
// yang menahannya terbuka cuma memakan kuota koneksi).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${CONFIG.SITE_URL}/sitemap.xml`,
  };
}
