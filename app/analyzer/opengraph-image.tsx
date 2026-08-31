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
          backgroundColor: "#fcf8f1",
          padding: "60px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              backgroundColor: "#7a5a3e",
            }}
          />
          <div style={{ fontSize: 22, letterSpacing: "0.18em", color: "#93887a", fontWeight: 700 }}>
            THE CARNIVORE SYSTEM · FREE TOOL
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 104, fontWeight: 800, color: "#211a12", lineHeight: 1.02, letterSpacing: "-3px" }}>
            Diet
          </div>
          <div style={{ fontSize: 104, fontWeight: 800, color: "#7a5a3e", lineHeight: 1.02, letterSpacing: "-3px" }}>
            Analyzer
          </div>
          <div style={{ fontSize: 28, color: "#93887a", marginTop: 28, maxWidth: 920 }}>
            What is your carnivore diet missing? Nutrient by nutrient, with the food that fixes
            each gap. Free, no signup.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 10,
            width: 260,
            borderRadius: 999,
            backgroundColor: "#251e17",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
