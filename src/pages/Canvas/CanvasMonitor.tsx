import { useRef, useEffect, useState, useMemo } from "react";
import "./CanvasMonitor.css";
import { SegmentedVirtualList } from "../../components/virtual/SegmentedVirtualList";
import Button, {
  ButtonSize,
  ButtonVariant,
} from "../../components/common/Button";

// CAD physical size (mm)
const CAD_WIDTH = 50000;
const CAD_HEIGHT = 30000;

interface Point {
  x: number; // 图像像素坐标 (px)
  y: number;
}

interface VirtualPoint extends Point {
  insertIndex: number;
}

export const CanvasMonitor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // 视图矩阵状态
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // 标注数据
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const ratio = useMemo(() => {
    if (!img) return { x: 1, y: 1 };
    return { x: img.width / CAD_WIDTH, y: img.height / CAD_HEIGHT };
  }, [img]);

  const virtualListData = useMemo(() => {
    return points.map((p, i) => ({
      id: `point-${i}-${p.x}-${p.y}`,
      x: p.x,
      y: p.y,
      index: i,
    }));
  }, [points]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const image = new Image();
        image.src = event.target?.result as string;
        image.onload = () => {
          setImg(image);
          resetView(image);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const resetView = (currentImg: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const initialScale =
        Math.min(
          canvas.width / currentImg.width,
          canvas.height / currentImg.height,
        ) * 0.8;
      setScale(initialScale);
      setOffset({
        x: (canvas.width - currentImg.width * initialScale) / 2,
        y: (canvas.height - currentImg.height * initialScale) / 2,
      });
    }
  };

  useEffect(() => {
    const image = new Image();
    image.src = "https://picsum.photos/id/237/1200/800";
    image.onload = () => {
      setImg(image);
      resetView(image);
    };

    const handleResize = () => {
      if (img) resetView(img);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (!isSpacePressed) setIsSpacePressed(true);
        if (e.target === document.body) e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        setPoints((prev) => prev.slice(0, -1));
        setSelectedIndex(null);
        setDraggedIndex(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  const getCanvasMousePos = (e: React.MouseEvent | React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const toImageSpace = (cX: number, cY: number) => ({
    x: (cX - offset.x) / scale,
    y: (cY - offset.y) / scale,
  });

  const toCanvasSpace = (iX: number, iY: number) => ({
    x: iX * scale + offset.x,
    y: iY * scale + offset.y,
  });

  const getDistance = (p1: Point, p2: Point) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const clampPoint = (p: Point): Point => {
    if (!img) return p;
    return {
      x: Math.max(0, Math.min(img.width, p.x)),
      y: Math.max(0, Math.min(img.height, p.y)),
    };
  };

  const getClosestPointOnSegment = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(getDistance(v, w), 2);
    if (l2 === 0) return { dist: getDistance(p, v), point: v };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return { dist: getDistance(p, proj), point: proj };
  };

  const virtualPoints = useMemo<VirtualPoint[]>(() => {
    if (selectedIndex === null || points.length < 3) return [];
    const count = points.length;
    const prevIdx = (selectedIndex - 1 + count) % count;
    const nextIdx = (selectedIndex + 1) % count;
    return [
      {
        x: (points[prevIdx].x + points[selectedIndex].x) / 2,
        y: (points[prevIdx].y + points[selectedIndex].y) / 2,
        insertIndex: selectedIndex,
      },
      {
        x: (points[selectedIndex].x + points[nextIdx].x) / 2,
        y: (points[selectedIndex].y + points[nextIdx].y) / 2,
        insertIndex: nextIdx,
      },
    ];
  }, [points, selectedIndex]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x: cX, y: cY } = getCanvasMousePos(e);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(20, scale * zoomFactor));
    const { x: lX, y: lY } = toImageSpace(cX, cY);
    setOffset({
      x: cX - lX * newScale,
      y: cY - lY * newScale,
    });
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x: cX, y: cY } = getCanvasMousePos(e);
    const lP = toImageSpace(cX, cY);

    if (isSpacePressed || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const clickedPointIndex = points.findIndex((p) => {
      const canvasP = toCanvasSpace(p.x, p.y);
      return getDistance({ x: cX, y: cY }, canvasP) < 12;
    });

    if (clickedPointIndex !== -1) {
      setSelectedIndex(clickedPointIndex);
      setDraggedIndex(clickedPointIndex);
      return;
    }

    const clickedVPoint = virtualPoints.find((vp) => {
      const canvasVP = toCanvasSpace(vp.x, vp.y);
      return getDistance({ x: cX, y: cY }, canvasVP) < 12;
    });

    if (clickedVPoint) {
      const insertIdx = clickedVPoint.insertIndex;
      setPoints((prev) => {
        const next = [...prev];
        next.splice(insertIdx, 0, { x: clickedVPoint.x, y: clickedVPoint.y });
        return next;
      });
      setSelectedIndex(insertIdx);
      setDraggedIndex(insertIdx);
      return;
    }

    if (points.length >= 3) {
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const { dist, point } = getClosestPointOnSegment(lP, p1, p2);
        if (dist * scale < 10) {
          const clampedPoint = clampPoint(point);
          const insertIdx = i + 1;
          setPoints((prev) => {
            const next = [...prev];
            next.splice(insertIdx, 0, clampedPoint);
            return next;
          });
          setSelectedIndex(insertIdx);
          setDraggedIndex(insertIdx);
          return;
        }
      }
    }

    if (points.length < 3) {
      const clampedNewPoint = clampPoint(lP);
      const newIndex = points.length;
      setPoints((prev) => [...prev, clampedNewPoint]);
      setSelectedIndex(newIndex);
      setDraggedIndex(newIndex);
    } else {
      setSelectedIndex(null);
      setDraggedIndex(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    if (draggedIndex !== null) {
      const { x: cX, y: cY } = getCanvasMousePos(e);
      const lP = clampPoint(toImageSpace(cX, cY));
      setPoints((prev) => {
        const next = [...prev];
        next[draggedIndex] = lP;
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedIndex(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !img || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.drawImage(img, 0, 0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(0, 0, img.width, img.height);

    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++)
        ctx.lineTo(points[i].x, points[i].y);
      if (points.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 191, 255, 0.15)";
        ctx.fill();
        ctx.strokeStyle = "#00bfff";
      } else {
        ctx.strokeStyle = "#ffcc00";
      }
      ctx.lineWidth = 2 / scale;
      ctx.lineJoin = "round";
      ctx.stroke();

      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 / scale, 0, Math.PI * 2);
        ctx.fillStyle = selectedIndex === i ? "#00bfff" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = selectedIndex === i ? "#ffffff" : "#333333";
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
        if (selectedIndex === i) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10 / scale, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 191, 255, 0.5)";
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
        }
      });

      virtualPoints.forEach((vp) => {
        ctx.beginPath();
        ctx.arc(vp.x, vp.y, 5 / scale, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#00bfff";
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      });
    }
    ctx.restore();
  }, [img, scale, offset, points, selectedIndex, virtualPoints]);

  const getCursor = () => {
    if (isPanning) return "grabbing";
    if (isSpacePressed) return "grab";
    if (draggedIndex !== null) return "grabbing";
    return "crosshair";
  };

  const renderCoordinateItem = (item: any) => (
    <div className="coordinate-item">
      <div className="coord-label">顶点 {item.index + 1}:</div>
      <div>
        像素: {Math.round(item.x)}, {Math.round(item.y)}
      </div>
      <div className="coord-cad">
        CAD: {Math.round(item.x / ratio.x)}mm, {Math.round(item.y / ratio.y)}mm
      </div>
    </div>
  );

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="monitor-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: getCursor() }}
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleImageUpload}
      />

      <div className="floating-panel">
        <div className="panel-title">AI 监控区域标注</div>
        <div className="status-info">
          顶点数量:{" "}
          <span style={{ color: "#00bfff", fontWeight: "bold" }}>
            {points.length}
          </span>
          <br />
          当前状态:{" "}
          {points.length >= 3 ? (
            <span style={{ color: "#00ff88" }}>● 区域已生效</span>
          ) : (
            <span style={{ color: "#ffcc00" }}>○ 标注中...</span>
          )}
        </div>

        <div className="data-section">
          <div className="section-title">坐标数据对照 (像素 vs CAD)</div>
          <div
            className="coordinate-list-container"
            style={{ height: "180px", position: "relative" }}
          >
            {points.length === 0 ? (
              <div style={{ padding: "10px", fontSize: "11px", color: "#aaa" }}>
                暂无坐标数据
              </div>
            ) : (
              <SegmentedVirtualList
                listData={virtualListData}
                estimatedItemHeight={60}
                containerHeight={180}
                bufferCount={5}
                segmentSize={100}
                renderItem={renderCoordinateItem}
              />
            )}
          </div>
        </div>

        <div className="guide-section">
          <div className="guide-item">
            🖱️ <b>点击边缘</b>: 任意位置加点并拖拽
          </div>
          <div className="guide-item">
            ⌨️ <b>空格 + 拖拽</b>: 移动画布
          </div>
          <div className="guide-item">
            ⚪ <b>实心节点</b>: 辅助快速等分边
          </div>
          <div className="guide-item">
            ⌨️ <b>Ctrl + Z</b>: 撤销标注点
          </div>
        </div>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.LG}
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginTop: "20px",
            width: "100%",
            fontWeight: "600",
            gap: "8px",
          }}
          icon="📷"
        >
          更换背景图片
        </Button>
      </div>
    </div>
  );
};
