import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#120e0a",
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: 32,
            background: "#E24A16",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F4EBE0",
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          ف
        </div>
      </div>
    ),
    size,
  );
}
