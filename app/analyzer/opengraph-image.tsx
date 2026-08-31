import { ImageResponse } from "next/og";

export const alt = "Carnivore Diet Analyzer — find the gaps in what you eat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Rendered at request time by next/og. Screenshots are how this tool spreads,
 * and a shared link with a blank card wastes the click that earns.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ede7d9",
          padding: "60px 64px",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              backgroundColor: "#a6251c",
            }}
          />
          <div style={{ fontSize: 22, letterSpacing: "0.25em", color: "#6b6053" }}>
            THE CARNIVORE SYSTEM — CS.04 · FREE TOOL
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, fontWeight: 800, color: "#17110f", lineHeight: 1 }}>
            DIET
          </div>
          <div style={{ fontSize: 112, fontWeight: 800, color: "#a6251c", lineHeight: 1 }}>
            ANALYZER
          </div>
          <div style={{ fontSize: 28, color: "#6b6053", marginTop: 28, maxWidth: 920 }}>
            What is your carnivore diet missing? Nutrient by nutrient, with the food that fixes
            each gap. Free, no signup.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 8,
            width: "100%",
            backgroundImage: "linear-gradient(90deg, #7a1a13, #a6251c 35%, rgba(0,0,0,0))",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
