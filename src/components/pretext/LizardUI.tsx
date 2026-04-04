import React from "react";

export const LizardHeader: React.FC<{ layoutTime: number }> = ({
  layoutTime,
}) => (
  <div
    className="pretext-header"
    style={{
      background: "#1a1a1a",
      borderBottom: "1px solid #333",
      padding: "15px 25px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 10,
    }}
  >
    <div className="pretext-title">
      <h1
        style={{
          color: "#fff",
          margin: 0,
          fontSize: "18px",
          letterSpacing: "1px",
        }}
      >
        CHROMA_TEXT_FLOW
      </h1>
      <p style={{ color: "#666", margin: 0, fontSize: "11px" }}>
        Video-Driven Dynamic Typography Engine
      </p>
    </div>
    <div className="pretext-stats" style={{ display: "flex", gap: "20px" }}>
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            color: "#0f0",
            display: "block",
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          {layoutTime.toFixed(2)}ms
        </span>
        <span style={{ color: "#444", fontSize: "9px" }}>COMPUTE</span>
      </div>
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            color: "#0f0",
            display: "block",
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          60
        </span>
        <span style={{ color: "#444", fontSize: "9px" }}>FPS</span>
      </div>
    </div>
  </div>
);

export const LizardControls: React.FC<{
  fontSize: number;
  setFontSize: (v: number) => void;
  lineHeight: number;
  setLineHeight: (v: number) => void;
  onVideoUpload: (file: File) => void;
}> = ({ fontSize, setFontSize, lineHeight, setLineHeight, onVideoUpload }) => (
  <div
    className="pretext-controls"
    style={{
      position: "absolute",
      bottom: "20px",
      left: "20px",
      background: "rgba(20,20,20,0.95)",
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid #333",
      zIndex: 100,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      width: "220px",
    }}
  >
    <div style={{ marginBottom: "15px" }}>
      <label
        style={{
          color: "#888",
          display: "block",
          fontSize: "10px",
          marginBottom: "8px",
          letterSpacing: "1px",
        }}
      >
        TYPOGRAPHY: {fontSize}px
      </label>
      <input
        type="range"
        min="10"
        max="22"
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#0f0" }}
      />
    </div>
    <div style={{ marginBottom: "20px" }}>
      <label
        style={{
          color: "#888",
          display: "block",
          fontSize: "10px",
          marginBottom: "8px",
          letterSpacing: "1px",
        }}
      >
        LEADING: {lineHeight}px
      </label>
      <input
        type="range"
        min="14"
        max="32"
        value={lineHeight}
        onChange={(e) => setLineHeight(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#0f0" }}
      />
    </div>
    <div style={{ borderTop: "1px solid #333", paddingTop: "15px" }}>
      <label
        htmlFor="video-upload"
        style={{
          display: "block",
          background: "#333",
          color: "#fff",
          padding: "8px",
          borderRadius: "6px",
          textAlign: "center",
          fontSize: "11px",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        UPLOAD GREENSCREEN VIDEO
      </label>
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) =>
          e.target.files?.[0] && onVideoUpload(e.target.files[0])
        }
      />
    </div>
  </div>
);
