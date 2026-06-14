import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ApexChain — Network Operations Intelligence",
    short_name: "ApexChain",
    description:
      "Enterprise network operations intelligence platform. Real-time outage management, SLA enforcement, and automated blockchain payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#4F46E5",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "utilities"],
    lang: "en-US",
    dir: "ltr",
    scope: "/",
    id: "apexchain",
  };
}
