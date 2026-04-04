import React, { useRef, useEffect, useState } from 'react';
import { layoutNextLine } from '@chenglou/pretext';

interface VideoTextEngineProps {
  prepared: any;
  fontSize: number;
  lineHeight: number;
  videoUrl: string;
  onLayoutUpdate: (time: number) => void;
  onFpsUpdate: (fps: number) => void;
}

export const LizardCanvas: React.FC<VideoTextEngineProps> = ({ prepared, fontSize, lineHeight, videoUrl, onLayoutUpdate, onFpsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let rafId: number;
    let engineStarted = false;
    let lastTime = performance.now();
    let frames = 0;
    let fpsInterval = 500; // 每 500ms 更新一次 FPS
    let lastFpsUpdate = lastTime;

    const startEngine = () => {
      const displayCanvas = displayCanvasRef.current;
      const bufferCanvas = bufferCanvasRef.current;
      if (!displayCanvas || !bufferCanvas || engineStarted) return;

      engineStarted = true; setIsReady(true);
      const dctx = displayCanvas.getContext('2d')!;
      const bctx = bufferCanvas.getContext('2d', { willReadFrequently: true })!;

      const AW = 160, AH = 120;
      bufferCanvas.width = AW; bufferCanvas.height = AH;

      const render = () => {
        const now = performance.now();
        frames++;

        // 真实 FPS 计算逻辑
        if (now - lastFpsUpdate >= fpsInterval) {
          const actualFps = Math.round((frames * 1000) / (now - lastFpsUpdate));
          onFpsUpdate(actualFps);
          frames = 0;
          lastFpsUpdate = now;
        }

        if (video.paused || video.ended) {
          if (video.paused && isReady) video.play().catch(() => {});
          rafId = requestAnimationFrame(render);
          return;
        }
        
        const startTime = performance.now();
        const dw = containerRef.current?.clientWidth || 800;
        const dh = containerRef.current?.clientHeight || 600;

        if (displayCanvas.width !== dw) { displayCanvas.width = dw; displayCanvas.height = dh; }

        // 1. 采样人物轮廓
        bctx.drawImage(video, 0, 0, AW, AH);
        const pixels = bctx.getImageData(0, 0, AW, AH).data;
        const profile = new Array(AH).fill(null).map(() => ({ min: AW, max: 0 }));
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
          const isGreen = g > 60 && g > r * 1.1 && g > b * 1.1;
          const idx = i / 4, y = Math.floor(idx / AW), x = idx % AW;
          if (!isGreen && x > 4 && x < AW - 4 && y > 4 && y < AH - 4) {
            if (x < profile[y].min) profile[y].min = x;
            if (x > profile[y].max) profile[y].max = x;
          }
        }

        // 2. 物理裁剪渲染层
        dctx.clearRect(0, 0, dw, dh);
        const vRatio = video.videoWidth / video.videoHeight;
        const renderH = dh * 0.85, renderW = renderH * vRatio;
        const renderX = (dw - renderW) / 2, renderY = (dh - renderH) / 2;

        dctx.save();
        dctx.beginPath(); dctx.rect(renderX + 8, renderY + 8, renderW - 16, renderH - 16); dctx.clip();
        dctx.drawImage(video, renderX, renderY, renderW, renderH);
        
        const frameData = dctx.getImageData(renderX, renderY, renderW, renderH);
        const d = frameData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+1] > 60 && d[i+1] > d[i] * 1.1 && d[i+1] > d[i+2] * 1.1) d[i+3] = 0;
        }
        dctx.putImageData(frameData, renderX, renderY);
        dctx.restore();

        // 3. Pretext 排版
        if (prepared && prepared.segments) {
          dctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          dctx.font = `${fontSize}px "Inter", sans-serif`;
          dctx.textBaseline = 'top';
          dctx.shadowColor = 'rgba(0,0,0,0.8)'; dctx.shadowBlur = 8;

          let curY = 40;
          let cursor = { segmentIndex: 0, graphemeIndex: 0 };
          const padding = 40;

          while (curY < dh - 40 && cursor.segmentIndex < prepared.segments.length) {
            const relY = (curY - renderY) / renderH;
            const ay = Math.floor(relY * AH);
            let hasObstacle = false;
            let obsL = 0, obsR = 0;

            if (ay >= 0 && ay < AH) {
              const row = profile[ay];
              if (row.min < row.max) {
                obsL = renderX + (row.min / AW) * renderW - 20;
                obsR = renderX + (row.max / AW) * renderW + 20;
                hasObstacle = true;
              }
            }

            if (hasObstacle) {
              const leftW = obsL - padding;
              if (leftW > 40) { const ln = layoutNextLine(prepared, cursor, leftW); if (ln) { dctx.fillText(ln.text, padding, curY); cursor = ln.end; } }
              const rightW = (dw - padding) - obsR;
              if (rightW > 40) { const ln = layoutNextLine(prepared, cursor, rightW); if (ln) { dctx.fillText(ln.text, obsR, curY); cursor = ln.end; } }
            } else {
              const ln = layoutNextLine(prepared, cursor, dw - padding * 2);
              if (ln) { dctx.fillText(ln.text, padding, curY); cursor = ln.end; }
            }
            curY += lineHeight;
          }
          dctx.shadowBlur = 0;
        }

        onLayoutUpdate(performance.now() - startTime);
        rafId = requestAnimationFrame(render);
      };
      render();
    };

    video.src = videoUrl;
    video.load();
    video.play().catch(() => {});
    video.addEventListener('playing', startEngine);
    return () => {
      video.removeEventListener('playing', startEngine);
      cancelAnimationFrame(rafId);
    };
  }, [prepared, fontSize, lineHeight, videoUrl]);

  return (
    <div ref={containerRef} onClick={() => videoRef.current?.play()} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
      <video ref={videoRef} loop muted autoPlay playsInline crossOrigin="anonymous" style={{ display: 'none' }} />
      <canvas ref={displayCanvasRef} style={{ width: '100%', height: '100%' }} />
      <canvas ref={bufferCanvasRef} style={{ display: 'none' }} />
      {!isReady && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#0f0', fontSize: '12px', fontFamily: 'monospace' }}>[ 系统正在初始化高清渲染集群... ]</div>}
    </div>
  );
};
