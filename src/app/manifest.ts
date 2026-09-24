import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SalesFlow",
    short_name: "SalesFlow",
    description: "Notes vocales de visite → email, tâches et fiche client.",
    start_url: "/app",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#2449c9",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
