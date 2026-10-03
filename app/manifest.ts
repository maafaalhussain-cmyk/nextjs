import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "J & M",
    short_name: "J&M",
    description: "تسوّق منتجات متنوعة من متاجر وبائعين متعددين.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#f7f9fc",
    theme_color: "#102b52",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
