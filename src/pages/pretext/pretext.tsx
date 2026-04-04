import React, { useState, useMemo } from "react";
import { prepareWithSegments } from "@chenglou/pretext";
import { LizardCanvas } from "../../components/pretext/LizardCanvas";
import {
  LizardHeader,
  LizardControls,
} from "../../components/pretext/LizardUI";
import "./PretextDemo.css";

import defaultVideo from "../../assets/steve.mp4";

const TEXT_CONTENT =
  `CHROMA_KEY_LAYOUT_SYSTEM // v11.0_STABLE. 实时绿幕抠像技术。文字流会自动避开画面中的非绿色区域。通过 Pretext 高性能迭代器，我们实现了每秒 60 帧的实时重排。这种效果常用于电影开场动画或高级数字画报。文字不再是死板的背景，而是具有物理实体的流体。您可以尝试调整字号和行高，观察排版如何适应人物轮廓的变化。 `.repeat(
    20,
  );

const PretextDemo: React.FC = () => {
  const [fontSize, setFontSize] = useState(13);
  const [lineHeight, setLineHeight] = useState(18);
  const [layoutTime, setLayoutTime] = useState(0);
  const [fps, setFps] = useState(60);
  const [videoUrl, setVideoUrl] = useState(defaultVideo);

  const prepared = useMemo(
    () =>
      prepareWithSegments(TEXT_CONTENT, `${fontSize}px "Inter", sans-serif`),
    [fontSize],
  );

  const handleVideoUpload = (file: File) => {
    setVideoUrl(URL.createObjectURL(file));
  };

  return (
    <div
      className="pretext-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-layout)",
      }}
    >
      <LizardHeader layoutTime={layoutTime} fps={fps} />

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
          onFpsUpdate={setFps}
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
