import React, { useEffect, useRef } from "react";

export type WatermarkMode = "canvas" | "svg" | "background";

interface VisibleWaterMarkProps {
  text?: string;
  gap?: number;
  angle?: number;
  fontSize?: number;
  opacity?: number;
  mode?: WatermarkMode;
}

/**
 * 终极防篡改明水印
 * 策略：挂载在 document.body，监听 body 的变化，防止通过删除父节点绕过
 */
export const VisibleWaterMark: React.FC<VisibleWaterMarkProps> = ({
  text = "机密文件",
  gap = 100,
  angle = -30,
  fontSize = 16,
  opacity = 0.15,
  mode = "background",
}) => {
  // 使用 ref 记录水印节点的 ID，方便在全局寻找
  const watermarkId = useRef(`wm-${Math.random().toString(36).slice(2)}`);
  const watermarkNodeRef = useRef<HTMLElement | null>(null);

  // 生成水印图片的 DataURL (Canvas/SVG 共用逻辑)
  const getWatermarkUrl = () => {
    const size = 200 + gap;
    if (mode === "svg") {
      const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" fill="rgba(0,0,0,${opacity})" font-family="Arial" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${angle}, ${size / 2}, ${size / 2})">
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
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(text, 0, 0);
    }
    return canvas.toDataURL("image/png");
  };

  // 创建/重建水印节点
  const createWatermark = () => {
    // 1. 如果已存在，先彻底移除
    const oldNode = document.getElementById(watermarkId.current);
    if (oldNode) oldNode.remove();

    // 2. 创建新节点
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
          pCtx.fillStyle = `rgba(0,0,0,${opacity})`;
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

    // 3. 强制锁定核心样式
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

    // 插入到 body 的第一个子节点，而不是 appendChild 到最后
    // 这样它就在 script 标签之前，减少对后续渲染的影响
    if (document.body.firstChild) {
      document.body.insertBefore(node, document.body.firstChild);
    } else {
      document.body.appendChild(node);
    }

    watermarkNodeRef.current = node;
  };

  useEffect(() => {
    createWatermark();

    // 重点：在 document.body 上开启全局观察
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 场景 A: 水印节点被直接删除，或其某个父节点被删导致它也消失了
        const isRemoved = Array.from(mutation.removedNodes).some(
          (node) =>
            node === watermarkNodeRef.current ||
            (node instanceof HTMLElement &&
              node.contains(watermarkNodeRef.current)),
        );

        // 场景 B: 水印节点的属性被修改
        const isModified =
          mutation.type === "attributes" &&
          mutation.target === watermarkNodeRef.current;

        if (isRemoved || isModified) {
          // 只有当水印节点真的不在 DOM 树中时才重建
          if (!document.getElementById(watermarkId.current)) {
            createWatermark();
          } else if (isModified) {
            // 属性被改了，强制刷回来
            createWatermark();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true, // 监听节点增删
      attributes: true, // 监听属性变化
      subtree: true, // 深度监听所有后代（解决删除父节点问题）
      attributeFilter: ["style", "class", "hidden"],
    });

    window.addEventListener("resize", createWatermark);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", createWatermark);
      // 安全移除：只有节点在 body 下时才移除
      if (
        watermarkNodeRef.current &&
        document.body.contains(watermarkNodeRef.current)
      ) {
        document.body.removeChild(watermarkNodeRef.current);
      }
    };
  }, [text, gap, angle, fontSize, opacity, mode]);

  // 组件本身不渲染任何内容到 React tree 中，它是通过 DOM API 渲染到 body 的
  return null;
};
