import React, { useEffect, useRef } from "react";

export type WatermarkMode = "canvas" | "svg" | "background";

interface VisibleWaterMarkProps {
  text: string;
  gap: number;
  angle: number;
  fontSize: number;
  opacity: number;
  color: string;
  mode: WatermarkMode;
}

/**
 * 终极防篡改明水印
 * 策略：挂载在 document.body，监听 body 的变化，防止通过删除父节点绕过
 */
export const VisibleWaterMark: React.FC<VisibleWaterMarkProps> = ({
  text,
  gap,
  angle,
  fontSize,
  opacity,
  color,
  mode,
}) => {
  const watermarkId = useRef(`wm-${Math.random().toString(36).slice(2)}`);
  const watermarkNodeRef = useRef<HTMLElement | null>(null);

  const getWatermarkUrl = () => {
    const size = 200 + gap;
    if (mode === "svg") {
      const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          fill="${color}" 
          fill-opacity="${opacity}" 
          font-family="Arial" 
          font-size="${fontSize}" 
          text-anchor="middle" 
          dominant-baseline="middle" 
          transform="rotate(${angle}, ${size / 2}, ${size / 2})"
        >
          ${text}
        </text>
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(size / 2, size / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(text, 0, 0);
    }
    return canvas.toDataURL("image/png");
  };

  const createWatermark = () => {
    const oldNode = document.getElementById(watermarkId.current);
    if (oldNode) oldNode.remove();

    let node: HTMLElement;
    if (mode === "canvas") {
      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const patternCanvas = document.createElement("canvas");
        const pSize = 200 + gap;
        patternCanvas.width = pSize;
        patternCanvas.height = pSize;
        const pCtx = patternCanvas.getContext("2d");
        if (pCtx) {
          pCtx.translate(pSize / 2, pSize / 2);
          pCtx.rotate((angle * Math.PI) / 180);
          pCtx.globalAlpha = opacity;
          pCtx.fillStyle = color;
          pCtx.font = `${fontSize}px Arial`;
          pCtx.textAlign = "center";
          pCtx.fillText(text, 0, 0);
        }
        const pattern = ctx.createPattern(patternCanvas, "repeat");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      node = canvas;
    } else {
      node = document.createElement("div");
      node.style.backgroundImage = `url(${getWatermarkUrl()})`;
      node.style.backgroundRepeat = "repeat";
    }

    node.id = watermarkId.current;
    const style: Partial<CSSStyleDeclaration> = {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "999999",
      pointerEvents: "none",
      display: "block",
      visibility: "visible",
      opacity: "1",
    };
    Object.assign(node.style, style);

    if (document.body.firstChild) {
      document.body.insertBefore(node, document.body.firstChild);
    } else {
      document.body.appendChild(node);
    }
    watermarkNodeRef.current = node;
  };

  useEffect(() => {
    createWatermark();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const isRemoved = Array.from(mutation.removedNodes).some(
          (node) =>
            node === watermarkNodeRef.current ||
            (node instanceof HTMLElement && node.contains(watermarkNodeRef.current)),
        );
        const isModified =
          mutation.type === "attributes" && mutation.target === watermarkNodeRef.current;

        if (isRemoved || isModified) {
          if (!document.getElementById(watermarkId.current)) {
            createWatermark();
          } else if (isModified) {
            createWatermark();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ["style", "class", "hidden"],
    });

    window.addEventListener("resize", createWatermark);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", createWatermark);
      if (watermarkNodeRef.current && document.body.contains(watermarkNodeRef.current)) {
        document.body.removeChild(watermarkNodeRef.current);
      }
    };
  }, [text, gap, angle, fontSize, opacity, color, mode]);

  return null;
};
