import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 340,
            height: 340,
            borderRadius: 80,
            background: "#E24A16",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F4EBE0",
            fontSize: 180,
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
