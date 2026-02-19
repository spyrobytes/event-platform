"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
          <div style={{ textAlign: "center", padding: "0 16px" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "32px", maxWidth: "28rem" }}>
              An unexpected error occurred. Please try again.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                  backgroundColor: "#7c3aed",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the app router context */}
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1a1a1a",
                  textDecoration: "none",
                }}
              >
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
