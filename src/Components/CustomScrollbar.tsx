import React, { useRef, useCallback, useMemo } from "react";

/**
 * 【自定义滚动条：虚拟列表的解决拖动滚动条“白屏”】
 *
 * 为什么自定义滚动条能解决快速拖动的白屏问题？
 *
 * 1. 原生滚动条的问题：
 *    原生滚动是由浏览器【合成线程】处理的，它飞快，但不等 JS 线程。
 *    当你猛拽滚动条，浏览器已经把视口移到了 5000px，但 React (主线程) 还在算第 100px 的数据。
 *    中间这 4900px 的时间差，就是你看到的“白屏”。
 *
 * 2. 自定义滚动条的原理：
 *    滚动不再是“物理位移”，而是“状态切换”。
 *    当你拖动自定义滑块，直接修改逻辑状态 `scrollTop`。
 *    React 收到新状态 -> 立即计算索引 -> 立即渲染 DOM。
 *    【核心点】：滚动条的位置和内容的渲染被强行绑定在了同一个 React 渲染周期内。
 *    没有了“异步时间差”，白屏自然就消失了。
 */

interface CustomScrollbarProps {
  contentHeight: number; // 逻辑总高度（已测量的真实高度 + 未测量的预估高度）
  containerHeight: number; // 可视窗口的高度（比如 600px）
  scrollTop: number; // 当前逻辑滚动的位移
  onScroll: (newScrollTop: number) => void; // 回调：告诉父组件“我要滚动到哪”
}

const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  contentHeight,
  containerHeight,
  scrollTop,
  onScroll,
}) => {
  // --- 引用定义 ---
  const trackRef = useRef<HTMLDivElement>(null); // 滚动条轨道
  const isDragging = useRef(false); // 标记位：当前是否正在按住滑块拖拽
  const startY = useRef(0); // 记录点击滑块那一刻，鼠标在屏幕上的 Y 坐标
  const startScrollTop = useRef(0); // 记录点击滑块那一刻，列表已经滚动的距离

  /**
   * 【重点优化：解决闭包陷阱】
   * 虚拟列表是动态高度的，contentHeight 会在滚动中频繁改变。
   * 我们用最新的数据实时更新这个 Ref，确保在拖拽过程中，
   * handleMouseMove 永远能拿到“当下”最准确的高度，而不是“点击那一刻”的高度。
   */
  const latestProps = useRef({ contentHeight, containerHeight, scrollTop });
  latestProps.current = { contentHeight, containerHeight, scrollTop };

  /**
   * 【步骤 1：几何比例计算】
   * 我们的目标是把“几百万像素的内容”映射到“几百像素的轨道”上。
   */

  // A. 计算滑块的物理高度
  // 公式：滑块高度 / 轨道高度 = 容器高度 / 总内容高度
  const thumbHeight = useMemo(() => {
    // 防止内容极多时滑块缩成一个点，我们设定一个 20px 的最小高度
    return Math.max(20, (containerHeight / contentHeight) * containerHeight);
  }, [containerHeight, contentHeight]);

  // B. 计算最大的物理位移空间 (滑块能在轨道里走多远)
  const maxThumbOffset = containerHeight - thumbHeight;

  // C. 计算最大的逻辑滚动空间 (内容能滚多远)
  const maxScrollTop = contentHeight - containerHeight;

  // D. 计算当前滑块应该在的位置 (Offset)
  // 比例：当前位置 / 最大空间
  const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
  const thumbOffset = scrollRatio * maxThumbOffset;

  /**
   * 【步骤 2：核心拖拽算法】
   * 将鼠标的像素位移，等比转化为列表的逻辑位移。
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      // 1. 获取最新的物理参数
      const { contentHeight: curCH, containerHeight: curCHHeight } =
        latestProps.current;

      // 2. 重新计算当前瞬间的比例（应对动态高度变化）
      const curMaxST = curCH - curCHHeight;
      const curThumbH = Math.max(20, (curCHHeight / curCH) * curCHHeight);
      const curMaxThumbOffset = curCHHeight - curThumbH;

      // 3. 计算鼠标从点击处开始移动了多少像素
      const deltaY = e.clientY - startY.current;

      // 4. 【核心换算】
      // 鼠标移动的比例 = 物理移动距离 / 物理最大空间
      const moveRatio = deltaY / curMaxThumbOffset;

      // 5. 逻辑新位置 = 点击时的位置 + (移动比例 * 逻辑最大空间)
      const newScrollTop = startScrollTop.current + moveRatio * curMaxST;

      // 6. 执行滚动（带边界检查）
      onScroll(Math.max(0, Math.min(newScrollTop, curMaxST)));
    },
    [onScroll],
  );

  // 释放鼠标：清理全局监听
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  /**
   * 【步骤 3：点击启动】
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // 防止拖拽时选中文字，手感更扎实
    isDragging.current = true;
    startY.current = e.clientY; // 记住起点
    startScrollTop.current = latestProps.current.scrollTop; // 记住起始滚动量

    // 必须绑定在 document 上！
    // 这样即便鼠标飞出了滚动条区域，只要没松开，依然可以控制滚动。
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * 【步骤 4：轨道快捷跳转】
   * 点击滑块以外的轨道区域，直接瞬移。
   */
  const handleTrackClick = (e: React.MouseEvent) => {
    // 如果点的是滑块本人，就不触发跳转（由 handleMouseDown 处理）
    if (e.target !== trackRef.current) return;

    const rect = trackRef.current!.getBoundingClientRect();
    // 计算点击位置占整个高度的比例
    const clickPosRatio = (e.clientY - rect.top) / containerHeight;
    // 直接根据比例跳转到内容位置
    onScroll(clickPosRatio * contentHeight);
  };

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "10px",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.03)", // 浅浅的轨道背景
        zIndex: 100, // 确保在最上层
        borderRadius: "5px",
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
          backgroundColor: "rgba(0,0,0,0.2)", // 滑块颜色
          borderRadius: "5px",
          // 使用 transform 而不是 top，性能更好且支持亚像素渲染
          transform: `translateY(${thumbOffset}px)`,
          cursor: "pointer",
          // 悬浮变色效果
          transition: "background-color 0.2s",
        }}
        // 增加一点交互美感
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.4)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)")
        }
      />
    </div>
  );
};

export default CustomScrollbar;
