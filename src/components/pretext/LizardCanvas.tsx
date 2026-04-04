import React, { useRef, useEffect, useState } from 'react';
import { layoutNextLine } from '@chenglou/pretext';

interface VideoTextEngineProps {
  prepared: any; fontSize: number; lineHeight: number; videoUrl: string;
  onLinesUpdate: (lines: any[]) => void;
  onFpsUpdate: (fps: number) => void;
  onLayoutUpdate: (time: number) => void;
}

const VS = `attribute vec2 p; varying vec2 v; void main() { v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0, 1); }`;
const FS = `
  precision mediump float;
  uniform sampler2D t;
  varying vec2 v;
  void main() {
    vec4 c = texture2D(t, v);
    // WebGL 看到的“人物”必须比 Worker 看到的“障碍物”范围小，确保文字永远在可见边缘之外
    float isGreen = step(0.48, c.g) * step(c.r * 1.1, c.g) * step(c.b * 1.1, c.g);
    if (v.x < 0.01 || v.x > 0.99 || v.y < 0.01 || v.y > 0.99 || isGreen > 0.5) discard;
    gl_FragColor = c;
  }
`;

export const LizardCanvas: React.FC<VideoTextEngineProps> = ({ prepared, fontSize, lineHeight, videoUrl, onLinesUpdate, onFpsUpdate, onLayoutUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const syncCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./chroma.worker.ts', import.meta.url), { type: 'module' });
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let rafId: number;
    let frames = 0;
    let lastFpsTime = performance.now();
    let currentProfile: any[] = [];
    let isWorkerBusy = false;

    workerRef.current.onmessage = (e) => {
      currentProfile = e.data.profile;
      isWorkerBusy = false;
    };

    const startEngine = () => {
      const glCanvas = glCanvasRef.current!;
      const syncCanvas = syncCanvasRef.current!;
      const gl = glCanvas.getContext('webgl', { alpha: true, antialias: true })!;
      const sctx = syncCanvas.getContext('2d', { willReadFrequently: true })!;

      const createShader = (t: number, s: string) => {
        const sh = gl.createShader(t)!; gl.shaderSource(sh, s); gl.compileShader(sh); return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog); gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(gl.getAttribLocation(prog, 'p'));
      gl.vertexAttribPointer(gl.getAttribLocation(prog, 'p'), 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      const SW = 320, SH = 240; 
      syncCanvas.width = SW; syncCanvas.height = SH;

      const render = () => {
        const now = performance.now();
        frames++;
        if (now - lastFpsTime >= 500) { onFpsUpdate(Math.round((frames * 1000) / (now - lastFpsTime))); frames = 0; lastFpsTime = now; }

        if (video.paused || video.ended) { rafId = requestAnimationFrame(render); return; }
        
        const startTime = performance.now();
        const dpr = window.devicePixelRatio || 1;
        const dw = containerRef.current!.clientWidth;
        const dh = containerRef.current!.clientHeight;

        if (glCanvas.width !== dw * dpr) {
          glCanvas.width = dw * dpr; glCanvas.height = dh * dpr;
          glCanvas.style.width = `${dw}px`; glCanvas.style.height = `${dh}px`;
          gl.viewport(0, 0, dw * dpr, dh * dpr);
        }

        if (video.readyState >= 2) {
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        if (!isWorkerBusy && video.readyState >= 2) {
          sctx.drawImage(video, 0, 0, SW, SH);
          const imageData = sctx.getImageData(0, 0, SW, SH);
          isWorkerBusy = true;
          workerRef.current?.postMessage({ imageData, SW, SH }, [imageData.data.buffer]);
        }

        if (prepared && prepared.segments && currentProfile.length > 0) {
          const vRatio = video.videoWidth / video.videoHeight || 1;
          const rH = dh * 0.85, rW = rH * vRatio;
          const rX = (dw - rW) / 2, rY = (dh - rH) / 2;

          let curY = 40;
          let cursor = { segmentIndex: 0, graphemeIndex: 0 };
          const padding = 40;
          const calculatedLines: any[] = [];

          while (curY < dh - 40 && cursor.segmentIndex < prepared.segments.length) {
            const relY = (curY - rY) / rH;
            
            // --- 核心优化：深度垂直宽域扫描 ---
            // 为了防止穿模，扫描范围覆盖整行文字高度，并向上下各延伸 15 像素
            const startScanY = Math.floor(((curY - 15 - rY) / rH) * SH);
            const endScanY = Math.ceil(((curY + lineHeight + 15 - rY) / rH) * SH);
            
            let occupiedSpans: number[][] = [];
            for (let sy = startScanY; sy <= endScanY; sy++) {
              const row = currentProfile[Math.min(Math.max(0, sy), SH - 1)];
              if (row) occupiedSpans.push(...row);
            }

            occupiedSpans.sort((a, b) => a[0] - b[0]);
            const merged: number[][] = [];
            if (occupiedSpans.length > 0) {
              let current = [occupiedSpans[0][0], occupiedSpans[0][1]];
              for (let i = 1; i < occupiedSpans.length; i++) {
                if (occupiedSpans[i][0] <= current[1] + 10) current[1] = Math.max(current[1], occupiedSpans[i][1]);
                else { merged.push([current[0], current[1]]); current = [occupiedSpans[i][0], occupiedSpans[i][1]]; }
              }
              merged.push(current);
            }

            let xX = padding;
            for (const span of merged) {
              // --- 绝对映射坐标 (Normalized Map) ---
              // 使用 100% 同步的数学比例进行换算，增加 25px 的固定避让带
              const obsL = rX + (span[0] / SW) * rW - 25;
              const obsR = rX + (span[1] / SW) * rW + 25;
              
              const availableW = obsL - xX;
              if (availableW > 35) {
                const ln = layoutNextLine(prepared, cursor, availableW);
                if (ln) { calculatedLines.push({ text: ln.text, x: xX, y: curY, w: ln.width }); cursor = ln.end; }
              }
              xX = Math.max(xX, obsR);
            }
            const lastW = (dw - padding) - xX;
            if (lastW > 35) {
              const ln = layoutNextLine(prepared, cursor, lastW);
              if (ln) { calculatedLines.push({ text: ln.text, x: xX, y: curY, w: ln.width }); cursor = ln.end; }
            }
            curY += lineHeight;
          }
          onLinesUpdate(calculatedLines);
        }
        onLayoutUpdate(performance.now() - startTime);
        rafId = requestAnimationFrame(render);
      };
      setIsReady(true); render();
    };

    video.src = videoUrl; video.addEventListener('playing', startEngine); video.play().catch(() => {});
    return () => { workerRef.current?.terminate(); cancelAnimationFrame(rafId); };
  }, [prepared, fontSize, lineHeight, videoUrl]);

  return (
    <div ref={containerRef} onClick={() => videoRef.current?.play()} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <video ref={videoRef} loop muted autoPlay playsInline crossOrigin="anonymous" style={{ display: 'none' }} />
      <canvas ref={glCanvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
      <canvas ref={syncCanvasRef} style={{ display: 'none' }} />
      {!isReady && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#0f0', fontSize: '12px' }}>[ 校准精密排版坐标系... ]</div>}
    </div>
  );
};
