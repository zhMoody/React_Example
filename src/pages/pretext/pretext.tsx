import React, { useState, useMemo } from "react";
import { prepareWithSegments } from "@chenglou/pretext";
import { LizardCanvas } from "../../components/pretext/LizardCanvas";
import {
  LizardHeader,
  LizardControls,
} from "../../components/pretext/LizardUI";
import "./PretextDemo.css";

// 默认视频路径（assets）
import defaultVideo from "../../assets/steve.mp4";

const TEXT_CONTENT =
  `CHROMA_KEY_LAYOUT_SYSTEM // v11.0_STABLE. This engine extracts character silhouettes from video streams in real-time. By analyzing pixel data through a low-latency chroma buffer, we identify the non-green boundaries of the subject. These coordinates are then mapped to the Pretext layout grid, allowing text to part organically around moving actors. The result is a seamless fusion of video motion and typographic structure. Dynamic wrapping. Precision profiling. Editorial motion design. `.repeat(
    20,
  );

const PretextDemo: React.FC = () => {
  const [fontSize, setFontSize] = useState(13);
  const [lineHeight, setLineHeight] = useState(18);
  const [layoutTime, setLayoutTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState(defaultVideo);

  const prepared = useMemo(
    () =>
      prepareWithSegments(TEXT_CONTENT, `${fontSize}px "Inter", sans-serif`),
    [fontSize],
  );

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  return (
    <div
      className="pretext-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1c1c1c",
      }}
    >
      <LizardHeader layoutTime={layoutTime} />

      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LizardCanvas
          prepared={prepared}
          fontSize={fontSize}
          lineHeight={lineHeight}
          videoUrl={videoUrl}
          onLayoutUpdate={setLayoutTime}
        />

        <LizardControls
          fontSize={fontSize}
          setFontSize={setFontSize}
          lineHeight={lineHeight}
          setLineHeight={setLineHeight}
          onVideoUpload={handleVideoUpload}
        />
      </div>
    </div>
  );
};

export default PretextDemo;
