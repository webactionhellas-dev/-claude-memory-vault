import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Green Cleaners · Premium eco dry cleaning in Athens";

// Embed the real logo (transparent PNG) as a data URI so it renders in the
// generated image. Falls back to a gold monogram if the file can't be read.
let logoDataUri: string | null = null;
try {
  const bytes = readFileSync(join(process.cwd(), "public", "brand", "logo.png"));
  logoDataUri = `data:image/png;base64,${bytes.toString("base64")}`;
} catch {
  logoDataUri = null;
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0c4a37 0%, #0a3a2c 60%, #07261d 100%)",
          color: "#FAF9F6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {logoDataUri ? (
            <div
              style={{
                display: "flex",
                background: "#ffffff",
                borderRadius: 24,
                padding: "22px 30px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri} width={300} height={150} alt="Green Cleaners" />
            </div>
          ) : (
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                background: "rgba(250,249,246,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 52,
                fontWeight: 700,
                color: "#B08D57",
              }}
            >
              G
            </div>
          )}
          <div style={{ fontSize: 28, letterSpacing: 6, color: "#B08D57", textTransform: "uppercase" }}>
            Green Technology
          </div>
        </div>
        <div style={{ fontSize: 40, marginTop: 44, color: "rgba(250,249,246,0.9)", maxWidth: 900 }}>
          Premium eco dry cleaning, hygienic laundry and free pickup. 7 stores across Athens.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
          {["Eco Solvent", "Free Storage", "Doorstep Pickup"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 26,
                padding: "12px 28px",
                borderRadius: 999,
                border: "2px solid rgba(176,141,87,0.6)",
                color: "#FAF9F6",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
