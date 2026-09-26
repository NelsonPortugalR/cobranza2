import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site.ts";
import { US_PRODUCTS } from "@/lib/catalog.ts";
import { US_BRANDS } from "@/lib/seo/brands.ts";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen por defecto al compartir el sitio en redes y mensajería.
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#efe7da", padding: 72, color: "#2a2622" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#6b4f3a" }}>{SITE.name}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 600 }}>Peruvian alpaca, compared.</div>
          <div style={{ fontSize: 32, marginTop: 24, color: "#6b4f3a" }}>
            {`${US_PRODUCTS.length.toLocaleString("en-US")} sweaters, cardigans & scarves from ${US_BRANDS.length} makers that ship to the US`}
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#7a7168" }}>Fiber content · sizes in stock · prices in USD</div>
      </div>
    ),
    size,
  );
}
