import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0284c7",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="3" width="12" height="3" rx="0.5" fill="white" fillOpacity="0.9" />
          <path
            d="M5 8h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 16h-1v3a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19v-3H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 8Z"
            fill="white"
          />
          <rect x="8" y="14" width="8" height="5" rx="0.6" fill="#0284c7" />
          <rect x="9.5" y="15.5" width="5" height="0.7" rx="0.3" fill="white" fillOpacity="0.85" />
          <rect x="9.5" y="17" width="3.5" height="0.7" rx="0.3" fill="white" fillOpacity="0.65" />
          <circle cx="16" cy="11" r="0.7" fill="#0284c7" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
