import React, { useState, useMemo } from 'react';
import { prepareWithSegments } from '@chenglou/pretext';
import { LizardCanvas } from '../../components/pretext/LizardCanvas';
import { LizardHeader, LizardControls } from '../../components/pretext/LizardUI';
import './PretextDemo.css';

import defaultVideo from '../../assets/steve.mp4';

const TEXT_CONTENT = `CHROMA_KEY_DOM_SYSTEM // v12.0_ULTRA. 极致高清排版方案。文字流通过 Pretext 引擎实时计算坐标，并使用 React 映射为原生 DOM 节点。这意味着文字拥有 100% 的矢量清晰度，完全不受 Canvas 像素操作的影响。影像层使用 WebGL 硬件加速抠像，逻辑层使用分布式 WebWorker 进行多槽位避障分析。这实现了文字钻进人物空隙、绕过不规则肢体的电影级视觉效果。所有的排版参数已针对当前视觉效果进行微调与固定。 `.repeat(25);

const PretextDemo: React.FC = () => {
  const [layoutTime, setLayoutTime] = useState(0);
  const [fps, setFps] = useState(60);
  const [videoUrl, setVideoUrl] = useState(defaultVideo);
  const [lines, setLines] = useState<any[]>([]);

  // 固定参数：22px / 32px
  const FONT_SIZE = 22;
  const LINE_HEIGHT = 32;

  const prepared = useMemo(() => 
    prepareWithSegments(TEXT_CONTENT, `${FONT_SIZE}px "Inter", sans-serif`), 
  []);

  const handleVideoUpload = (file: File) => {
    setVideoUrl(URL.createObjectURL(file));
  };

  return (
    <div className="pretext-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000' }}>
      <LizardHeader layoutTime={layoutTime} fps={fps} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 背景渲染层：视频 */}
        <LizardCanvas 
          prepared={prepared} 
          videoUrl={videoUrl}
          fontSize={FONT_SIZE} 
          lineHeight={LINE_HEIGHT} 
          onLinesUpdate={setLines}
          onFpsUpdate={setFps}
          onLayoutUpdate={setLayoutTime} 
        />
        
        {/* 前景渲染层：原生 DOM 文字 (无损画质) */}
        <div style={{ 
          position: 'absolute', 
          top: 0, left: 0, 
          width: '100%', height: '100%', 
          pointerEvents: 'none',
          zIndex: 5
        }}>
          {lines.map((line, i) => (
            <div 
              key={i} 
              style={{
                position: 'absolute',
                left: `${line.x}px`,
                top: `${line.y}px`,
                width: `${line.w}px`,
                fontSize: `${FONT_SIZE}px`,
                lineHeight: `${LINE_HEIGHT}px`,
                color: '#fff',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textShadow: '0 4px 12px rgba(0,0,0,0.9)'
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
        
        <LizardControls 
          videoUrl={videoUrl}
          onVideoUpload={handleVideoUpload}
        />
      </div>
    </div>
  );
};

export default PretextDemo;
