import React, { useState, useRef, useLayoutEffect } from "react";

/**
 * 【核心哲学：地图索引思想】
 * 在固定高度的列表中，靠“算”；在动态高度的列表中，靠“查表”。
 * 每一条数据在页面上的【起点、终点、高度】都会被记录在一张“地图”里（即 positions 数组）。
 */

// 1. 定义单条数据的原始结构
interface ListItem {
  id: number | string; // 唯一标识，React 渲染 key 的关键
  content: string; // 文本内容，长短不一会导致高度变化
}

// 2. 定义组件接收的外部参数
interface DynamicVirtualListProps {
  listData: ListItem[]; // 10万条原始数据源
  estimatedItemHeight: number; // 预估高度：在还没测量出真实高度前，先“猜”一个值（如50px）
  containerHeight: number; // 可视窗口高度：比如 600px，超过这个高度就出滚动条
  bufferCount: number; // 缓冲区：在可视区上下额外多画几条，防止滚动太快看到白屏
}

// 3. 【核心数据结构】地图信息
interface Position {
  index: number; // 索引，对应原始数据的下标
  height: number; // 这一项当前的物理高度（初始为预估值，测量后变为真实值）
  top: number; // 这一项距离【整个列表最顶端】的距离（即起点）
  bottom: number; // 这一项距离【整个列表最顶端】的距离（即终点，bottom = top + height）
}

const DynamicVirtualList: React.FC<DynamicVirtualListProps> = ({
  listData,
  estimatedItemHeight = 50,
  containerHeight = 600,
  bufferCount = 5,
}) => {
  // 引用最外层的滚动容器 DOM
  const containerRef = useRef<HTMLDivElement>(null);

  // 【状态】当前屏幕上能看到的第一个元素的索引
  // 只用这个状态来控制重绘，因为滚动时它变了，才意味着需要换一批数据展示
  const [start, setStart] = useState(0);

  /**
   * 【性能陷阱提示】
   * 为什么 positions 用 useRef 而不是 useState？
   * 因为要频繁修改 10 万个位置信息。如果用 useState，每次修改哪怕一丁点，
   * React 都会尝试去 Diff 这个巨大的数组，浏览器会瞬间卡死。
   * useRef 允许直接修改内存里的数据，而不会惊动 React 的渲染引擎。
   */
  const positions = useRef<Position[]>([]);

  /**
   * 【步骤 1：初始化地图（盲猜阶段）】
   * 既然还没开始画，不知道谁高谁矮，就假设大家都是 50px 高。
   * 这样就能先算出每个人的 top 和 bottom，把滚动条的长度撑出来。
   */
  const initPositions = () => {
    positions.current = listData.map((_, index) => ({
      index,
      height: estimatedItemHeight,
      top: index * estimatedItemHeight,
      bottom: (index + 1) * estimatedItemHeight,
    }));
  };

  // 第一次加载时，如果地图是空的，就去初始化它
  if (positions.current.length === 0) {
    initPositions();
  }

  /**
   * 【步骤 2：二分查找（高性能检索）】
   * 逻辑：用户滚动了 1000px，我得立刻知道“地图”里谁跨在了 1000px 这个点上。
   * 为什么用二分？：对于 10 万条数据，循环查找要找 10 万次，二分只需要找 17 次左右。
   * 目标：找到第一个 bottom 大于 scrollTop 的元素索引。
   */
  const getStartIndex = (scrollTop: number = 0) => {
    let left = 0;
    let right = positions.current.length - 1;
    let tempIndex = -1;

    while (left <= right) {
      // 算出中间位置
      const midIndex = Math.floor((left + right) / 2);
      // 获取中间那个人的底边位置
      const midBottom = positions.current[midIndex].bottom;

      if (midBottom === scrollTop) {
        // 刚好对齐，那么下一项就是要找的起始项
        return midIndex + 1;
      } else if (midBottom < scrollTop) {
        // 中间这项还在屏幕上方看不见的地方，往右边找
        left = midIndex + 1;
      } else {
        // 中间这项的底边已经超过了滚动高度，说明它可能就是起始项
        // 但要追求完美，继续向左看还有没有更靠上的项也满足条件
        if (tempIndex === -1 || tempIndex > midIndex) {
          tempIndex = midIndex;
        }
        right = midIndex - 1;
      }
    }
    return tempIndex;
  };

  /**
   * 【步骤 3：滚动响应】
   * 每当用户滚动，就去查“地图”，看看 start 索引变了没。
   */
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;

    // 查地图，获取新的起始索引
    const currentStart = getStartIndex(scrollTop);

    // 【性能优化】只有当索引真的变了（比如从第 5 行滚到了第 6 行），才去更新状态触发 React 重绘
    if (currentStart !== start) {
      setStart(currentStart);
    }
  };

  /**
   * 【步骤 4：确定渲染范围】
   * 能只画屏幕里的那几条，得加上缓冲区。
   */
  // 粗略算下一屏能放几个（用预估高度算）
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);
  // 向上扩充 bufferCount 条
  const renderStart = Math.max(0, start - bufferCount);
  // 向下扩充 bufferCount 条
  const renderEnd = Math.min(
    listData.length,
    start + visibleCount + bufferCount,
  );

  // 从 10 万条里精准切割出这一小块（比如只剩下 20 条）
  const visibleData = listData.slice(renderStart, renderEnd);

  /**
   * 【步骤 5：核心——位置修正（多米诺骨牌效应）】
   * 当子组件 Item 渲染后，发现自己真实高度是 80 而不是 50，就会调用这个函数。
   */
  const updatePositions = (index: number, height: number) => {
    const item = positions.current[index];
    if (!item) return;

    const oldHeight = item.height;
    const dValue = oldHeight - height; // 预估高度与真实高度的差值（正值代表变矮了，负值代表变高了）

    // 如果高度真的有变化，那就得改地图了
    if (dValue !== 0) {
      // 1. 先改自己
      item.height = height;
      item.bottom = item.top + height;

      // 2. 【连环修正】关键：因为我变高/矮了，我后面所有的邻居都要跟着往下/上挪动位置
      // 从当前项的下一项开始，一直修正到 10 万项的末尾
      for (let i = index + 1; i < positions.current.length; i++) {
        // 这一项的起点 = 前一项的终点
        positions.current[i].top = positions.current[i - 1].bottom;
        // 这一项的终点 = 这一项的起点 + 这一项原本的高度
        positions.current[i].bottom =
          positions.current[i].top + positions.current[i].height;
      }
    }
  };

  /**
   * 【步骤 6：物理布局计算】
   */
  // 【撑高层高度】：整个列表到底有多长？看地图里最后一个人的底边在哪
  const phantomHeight =
    positions.current.length > 0
      ? positions.current[positions.current.length - 1].bottom
      : 0;

  // 【渲染层偏移】：渲染层必须定位到 renderStart 对应的那一项的 top 位置
  // 这样才能保证：无论上面的元素怎么变高变矮，当前的元素都能准确出现在它该出现的位置
  const startOffset = positions.current[renderStart]
    ? positions.current[renderStart].top
    : 0;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: `${containerHeight}px`,
        overflow: "auto", // 产生原生滚动条
        position: "relative", // 方便内部元素绝对定位
      }}
    >
      {/* 
         【撑高层 Phantom】
         它没有任何内容，只是一块透明的“板子”。
         它的作用是把外层容器的滚动条撑开，告诉浏览器：我这个列表其实有 5 万像素高。
      */}
      <div
        style={{
          height: `${phantomHeight}px`,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: -1,
        }}
      />

      {/* 
         【渲染层 List】
         它装着真正看到的 DOM。它必须使用绝对定位。
         通过 translate3d 把这一小块内容平移到用户当前的视线范围内。
      */}
      <div
        style={{
          transform: `translate3d(0, ${startOffset}px, 0)`,
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
        }}
      >
        {visibleData.map((item, index) => (
          <Item
            key={item.id} // 必须使用稳定 ID，不能用 index，否则复用 DOM 时高度测量会乱
            index={renderStart + index} // 告诉子组件它在 10 万条数据里的真实排名
            content={item.content}
            onSizeChange={updatePositions} // 传给子组件的回调，用于上报真实高度
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 【子组件：高度测量仪】
 * 每一个 Item 渲染出来后，都要第一时间量一下自己多高。
 */
const Item: React.FC<{
  index: number;
  content: string;
  onSizeChange: (index: number, height: number) => void;
}> = ({ index, content, onSizeChange }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (nodeRef.current) {
      const height = nodeRef.current.getBoundingClientRect().height;
      onSizeChange(index, height);
    }
  }, [content, index, onSizeChange]);

  return (
    <div
      ref={nodeRef}
      style={{
        padding: "16px",
        borderBottom: "1px solid #1a1a1a",
        boxSizing: "border-box",
        background: "#000",
        wordBreak: "break-all",
      }}
    >
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            background: "rgba(99, 102, 241, 0.15)",
            color: "var(--primary-color)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            fontFamily: "monospace",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}
        >
          内存寻址: 0x{index.toString(16).toUpperCase().padStart(4, "0")}
        </span>
        <div
          style={{
            height: "1px",
            flex: 1,
            background: "rgba(255,255,255,0.05)",
          }}
        ></div>
      </div>
      <div style={{ 
        color: "#10b981", 
        fontFamily: "monospace", 
        fontSize: "13px",
        lineHeight: "1.6",
        opacity: 0.9
      }}>
        {`:: ${content}`}
      </div>
    </div>
  );
};

export default DynamicVirtualList;
