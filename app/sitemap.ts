import type { MetadataRoute } from "next";
import { CONFIG } from "@/lib/config";

// /sitemap.xml: situs ini cuma satu halaman.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: CONFIG.SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
