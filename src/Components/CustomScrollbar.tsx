import React, { useRef, useCallback, useMemo } from "react";

/**
 * 【自定义滚动条：修复消失/异常逻辑】
 */

interface CustomScrollbarProps {
  contentHeight: number;
  containerHeight: number;
  scrollTop: number;
  onScroll: (newScrollTop: number) => void;
}

const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  contentHeight,
  containerHeight,
  scrollTop,
  onScroll,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const latestProps = useRef({ contentHeight, containerHeight, scrollTop });
  latestProps.current = { contentHeight, containerHeight, scrollTop };

  // 是否需要显示滚动条
  const shouldShow = contentHeight > containerHeight + 1; // 增加 1px 容差

  // A. 计算滑块物理高度
  const thumbHeight = useMemo(() => {
    if (!shouldShow || contentHeight <= 0) return 0;
    const height = (containerHeight / contentHeight) * containerHeight;
    return Math.max(20, Math.min(height, containerHeight)); // 最小 20px，最大不超容器
  }, [containerHeight, contentHeight, shouldShow]);

  // B. 计算物理最大位移
  const maxThumbOffset = containerHeight - thumbHeight;

  // C. 计算逻辑最大位移
  const maxScrollTop = contentHeight - containerHeight;

  // D. 计算当前偏移
  const thumbOffset = useMemo(() => {
    if (maxScrollTop <= 0) return 0;
    const ratio = scrollTop / maxScrollTop;
    return ratio * maxThumbOffset;
  }, [scrollTop, maxScrollTop, maxThumbOffset]);

  /**
   * 拖拽逻辑
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const { contentHeight: curCH, containerHeight: curCHHeight } = latestProps.current;
      const curMaxST = curCH - curCHHeight;
      const curThumbH = Math.max(20, Math.min((curCHHeight / curCH) * curCHHeight, curCHHeight));
      const curMaxThumbOffset = curCHHeight - curThumbH;

      const deltaY = e.clientY - startY.current;
      const moveRatio = curMaxThumbOffset > 0 ? deltaY / curMaxThumbOffset : 0;
      const newScrollTop = startScrollTop.current + moveRatio * curMaxST;

      onScroll(Math.max(0, Math.min(newScrollTop, curMaxST)));
    },
    [onScroll],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = ""; // 恢复文字选中
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = latestProps.current.scrollTop;
    document.body.style.userSelect = "none"; // 拖拽时禁用文字选中
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current!.getBoundingClientRect();
    const clickPosRatio = (e.clientY - rect.top) / containerHeight;
    onScroll(clickPosRatio * contentHeight - containerHeight / 2);
  };

  // 如果不需要滚动，隐藏整个组件
  if (!shouldShow) return null;

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      style={{
        position: "absolute",
        top: 0,
        right: 2,
        width: "8px",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.02)",
        zIndex: 1000, // 确保在最最上层
        borderRadius: "4px",
        cursor: "default",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: `${thumbHeight}px`,
          backgroundColor: "rgba(0,0,0,0.25)",
          borderRadius: "4px",
          transform: `translateY(${thumbOffset}px)`,
          cursor: "pointer",
          transition: "background-color 0.2s, width 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.4)";
          e.currentTarget.style.width = "10px";
          e.currentTarget.parentElement!.style.width = "10px";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.25)";
          e.currentTarget.style.width = "100%";
          e.currentTarget.parentElement!.style.width = "8px";
        }}
      />
    </div>
  );
};

export default CustomScrollbar;
