import React, { useRef, useEffect, useState } from 'react';
import { layoutNextLine } from '@chenglou/pretext';

interface VideoTextEngineProps {
  prepared: any; fontSize: number; lineHeight: number; videoUrl: string;
  onLayoutUpdate: (time: number) => void;
  onFpsUpdate: (fps: number) => void;
}

// WebGL 着色器代码：极致性能的绿色过滤逻辑
const VS = `attribute vec2 p; varying vec2 v; void main() { v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0, 1); }`;
const FS = `
  precision mediump float;
  uniform sampler2D t;
  varying vec2 v;
  void main() {
    vec4 c = texture2D(t, v);
    // 算法：检测绿色通道的主导地位
    float isGreen = step(0.5, c.g) * step(c.r * 1.1, c.g) * step(c.b * 1.1, c.g);
    // 物理裁剪边缘 2% 的像素，彻底解决绿线问题
    if (v.x < 0.02 || v.x > 0.98 || v.y < 0.02 || v.y > 0.98 || isGreen > 0.5) discard;
    gl_FragColor = c;
  }
`;

export const LizardCanvas: React.FC<VideoTextEngineProps> = ({ prepared, fontSize, lineHeight, videoUrl, onLayoutUpdate, onFpsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null); // WebGL 层 (GPU)
  const textCanvasRef = useRef<HTMLCanvasElement>(null); // 文字层 (Retina)
  const syncCanvasRef = useRef<HTMLCanvasElement>(null); // 低频采样层
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let rafId: number;
    let frames = 0;
    let lastFpsTime = performance.now();
    let profile: any[] = [];

    const startEngine = () => {
      const glCanvas = glCanvasRef.current!;
      const textCanvas = textCanvasRef.current!;
      const syncCanvas = syncCanvasRef.current!;
      const gl = glCanvas.getContext('webgl', { alpha: true, antialias: true })!;
      const tctx = textCanvas.getContext('2d')!;
      const sctx = syncCanvas.getContext('2d', { willReadFrequently: true })!;

      // 1. 初始化 WebGL 高清着色器程序
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
      const pLoc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      // 采样分辨率 (越低避障越丝滑)
      const SW = 80, SH = 60; syncCanvas.width = SW; syncCanvas.height = SH;

      const render = () => {
        const now = performance.now();
        frames++;
        if (now - lastFpsTime >= 500) { onFpsUpdate(Math.round((frames * 1000) / (now - lastFpsTime))); frames = 0; lastFpsTime = now; }

        if (video.paused || video.ended) { rafId = requestAnimationFrame(render); return; }
        
        const t0 = performance.now();
        const dpr = window.devicePixelRatio || 1;
        const dw = containerRef.current!.clientWidth;
        const dh = containerRef.current!.clientHeight;

        // Retina 级别物理分辨率对齐
        if (textCanvas.width !== dw * dpr) {
          [glCanvas, textCanvas].forEach(c => {
            c.width = dw * dpr; c.height = dh * dpr;
            c.style.width = `${dw}px`; c.style.height = `${dh}px`;
          });
          gl.viewport(0, 0, dw * dpr, dh * dpr);
          tctx.scale(dpr, dpr);
        }

        // --- STEP 1: GPU 实时高清抠像渲染 ---
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- STEP 2: 低频 CPU 采样 (仅用于 Pretext 避障) ---
        if (frames % 2 === 0) { // 每两帧采样一次障碍物，极致省电
          sctx.drawImage(video, 0, 0, SW, SH);
          const pixels = sctx.getImageData(0, 0, SW, SH).data;
          profile = new Array(SH).fill(null).map(() => ({ min: SW, max: 0 }));
          for (let i = 0; i < pixels.length; i += 4) {
            if (!(pixels[i+1] > 70 && pixels[i+1] > pixels[i] * 1.1)) {
              const x = (i/4)%SW, y = Math.floor((i/4)/SW);
              if (x < profile[y].min) profile[y].min = x; if (x > profile[y].max) profile[y].max = x;
            }
          }
        }

        // --- STEP 3: 高清 Pretext 排版 ---
        tctx.clearRect(0, 0, dw, dh);
        if (prepared && prepared.segments) {
          tctx.fillStyle = '#fff'; tctx.font = `bold ${fontSize}px "Inter", sans-serif`;
          tctx.textBaseline = 'top'; tctx.shadowColor = 'rgba(0,0,0,0.9)'; tctx.shadowBlur = 10;

          let curY = 40;
          let cursor = { segmentIndex: 0, graphemeIndex: 0 };
          const padding = 40;

          while (curY < dh - 40 && cursor.segmentIndex < prepared.segments.length) {
            const ay = Math.floor((curY / dh) * SH);
            const row = profile[Math.min(Math.max(0, ay), SH - 1)];
            
            if (row && row.min < row.max) {
              const obsL = (row.min / SW) * dw - 30;
              const obsR = (row.max / SW) * dw + 30;
              const leftW = obsL - padding;
              if (leftW > 40) { const lnL = layoutNextLine(prepared, cursor, leftW); if (lnL) { tctx.fillText(lnL.text, padding, curY); cursor = lnL.end; } }
              const rightW = (dw - padding) - obsR;
              if (rightW > 40) { const lnR = layoutNextLine(prepared, cursor, rightW); if (lnR) { tctx.fillText(lnR.text, obsR, curY); cursor = lnR.end; } }
            } else {
              const ln = layoutNextLine(prepared, cursor, dw - padding * 2);
              if (ln) { tctx.fillText(ln.text, padding, curY); cursor = ln.end; }
            }
            curY += lineHeight;
          }
        }

        onLayoutUpdate(performance.now() - t0);
        rafId = requestAnimationFrame(render);
      };
      setIsReady(true); render();
    };

    video.src = videoUrl; video.addEventListener('playing', startEngine); video.play().catch(() => {});
    return () => cancelAnimationFrame(rafId);
  }, [prepared, fontSize, lineHeight, videoUrl]);

  return (
    <div ref={containerRef} onClick={() => videoRef.current?.play()} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <video ref={videoRef} loop muted autoPlay playsInline crossOrigin="anonymous" style={{ display: 'none' }} />
      {/* GPU 渲染层 */}
      <canvas ref={glCanvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
      {/* 高清文字层 */}
      <canvas ref={textCanvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }} />
      <canvas ref={syncCanvasRef} style={{ display: 'none' }} />
      {!isReady && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#0f0', fontSize: '12px' }}>[ 分配 WebGL 着色核心... ]</div>}
    </div>
  );
};
