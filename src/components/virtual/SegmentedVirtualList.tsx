import React, { useState, useRef, useLayoutEffect, useCallback } from "react";
import CustomScrollbar from "./CustomScrollbar";

/**
 * 【分片式虚拟列表 + 自定义滚动条】
 *
 * 解决死循环的通用哲学：
 * 1. 消除冗余：不使用 useEffect 同步状态，而是直接在渲染期间计算“派生变量”。
 * 2. 单向流动：scrollTop 是唯一的驱动源，高度修正只静默修改 Ref，不反向触发滚动。
 */

interface ListItem {
  id: number | string;
  content: string;
}

interface SegmentedVirtualListProps {
  listData: ListItem[];
  estimatedItemHeight: number;
  containerHeight: number;
  bufferCount: number;
  segmentSize?: number; // 分片大小，如 1000 条一段
}

// 分片结构：存储这一千条数据的整体物理信息
interface Segment {
  startIndex: number; // 全局起始索引
  endIndex: number; // 全局结束索引
  totalHeight: number; // 这一段的总像素高度
  top: number; // 这一段距离列表顶部的绝对距离
  items: ItemPosition[]; // 内部每一项的相对位置
}

interface ItemPosition {
  height: number;
  top: number; // 相对于所属分片顶部的偏移
  bottom: number; // 相对于所属分片顶部的偏移
}

export const SegmentedVirtualList: React.FC<SegmentedVirtualListProps> = ({
  listData,
  estimatedItemHeight = 50,
  containerHeight = 600,
  bufferCount = 5,
  segmentSize = 1000,
}) => {
  /**
   * 【步骤 1：状态定义】
   * 只保留 scrollTop 这一个状态。
   * 为什么不留 start 状态？因为 start 是可以根据 scrollTop 算出来的。
   * 减少状态 = 减少重绘次数 = 杜绝死循环。
   */
  const [scrollTop, setScrollTop] = useState(0);

  // 引用容器，用于处理滚轮事件
  const containerRef = useRef<HTMLDivElement>(null);

  // 核心地图：分片信息。使用 useRef 是因为它变动频繁，且不应直接触发 React 全量 Diff。
  const segments = useRef<Segment[]>([]);

  /**
   * 【步骤 2：初始化分片地图】
   * 逻辑：把 10 万条数据按 segmentSize 切块，每块内部先用“预估高度”占位。
   */
  const initSegments = useCallback(() => {
    const newSegments: Segment[] = [];
    for (let i = 0; i < listData.length; i += segmentSize) {
      const end = Math.min(i + segmentSize, listData.length);
      const count = end - i;
      // 创建分片内部的每一项
      const items: ItemPosition[] = Array.from({ length: count }, (_, idx) => ({
        height: estimatedItemHeight,
        top: idx * estimatedItemHeight,
        bottom: (idx + 1) * estimatedItemHeight,
      }));

      newSegments.push({
        startIndex: i,
        endIndex: end,
        totalHeight: count * estimatedItemHeight,
        top: (i / segmentSize) * (segmentSize * estimatedItemHeight),
        items,
      });
    }
    segments.current = newSegments;
  }, [listData.length, estimatedItemHeight, segmentSize]);

  // 如果地图还没建，先建地图
  if (segments.current.length === 0) {
    initSegments();
  }

  /**
   * 【步骤 3：核心算法——两级二分查找】
   * 逻辑：先找在哪个“分片”，再在分片里找哪一项。
   * 复杂度：O(log(N/SegmentSize) + log(SegmentSize)) -> 极快。
   */
  const findStartIndex = (st: number) => {
    // 1. 找分片
    let sLeft = 0,
      sRight = segments.current.length - 1;
    let sIdx = 0;
    while (sLeft <= sRight) {
      const mid = Math.floor((sLeft + sRight) / 2);
      if (segments.current[mid].top <= st) {
        sIdx = mid;
        sLeft = mid + 1;
      } else {
        sRight = mid - 1;
      }
    }

    // 2. 找分片内的项
    const segment = segments.current[sIdx];
    const internalST = st - segment.top; // 转化为分片内部坐标
    let iLeft = 0,
      iRight = segment.items.length - 1;
    let iIdx = 0;
    while (iLeft <= iRight) {
      const mid = Math.floor((iLeft + iRight) / 2);
      if (segment.items[mid].bottom > internalST) {
        iIdx = mid;
        iRight = mid - 1;
      } else {
        iLeft = mid + 1;
      }
    }
    return segment.startIndex + iIdx;
  };

  /**
   * 【步骤 4：派生计算 (关键优化)】
   * 直接在渲染期间计算当前要显示的起始索引。
   * 只要 setScrollTop 被触发，React 重新运行此函数，start 就会自动更新。
   */
  const start = findStartIndex(scrollTop);

  /**
   * 【步骤 5：处理滚轮】
   * 由于隐藏了原生滚动条，需要手动更新逻辑状态。
   */
  const handleWheel = (e: React.WheelEvent) => {
    // e.deltaY 是滚轮位移量
    const newST = scrollTop + e.deltaY;
    // 限制滚动范围 [0, 最大高度 - 容器高度]
    const maxST = phantomHeight - containerHeight;
    setScrollTop(Math.max(0, Math.min(newST, maxST)));
  };

  /**
   * 【步骤 6：位置修正（局部多米诺）】
   * 逻辑：某项高度变了，只修正该分片内部，其他分片只改 top。
   */
  const updatePositions = useCallback(
    (globalIndex: number, height: number) => {
      const sIdx = Math.floor(globalIndex / segmentSize);
      const iIdx = globalIndex % segmentSize;
      const segment = segments.current[sIdx];
      if (!segment) return;

      const item = segment.items[iIdx];
      const dValue = height - item.height;

      if (dValue !== 0) {
        // 1. 修正分片内部
        item.height = height;
        item.bottom = item.top + height;
        for (let i = iIdx + 1; i < segment.items.length; i++) {
          segment.items[i].top = segment.items[i - 1].bottom;
          segment.items[i].bottom =
            segment.items[i].top + segment.items[i].height;
        }

        // 2. 修正分片总高度及后续分片的起点
        const oldTotal = segment.totalHeight;
        segment.totalHeight = segment.items[segment.items.length - 1].bottom;
        const actualDiff = segment.totalHeight - oldTotal;

        for (let j = sIdx + 1; j < segments.current.length; j++) {
          segments.current[j].top += actualDiff;
        }

        /**
         * 注意：这里没有 setState。
         * 因为高度修正通常发生在渲染后，我们不需要立即为了高度变化再去触发一轮滚动。
         * 滚动条组件会因为 contentHeight 属性的变化而在下一帧自动对齐。
         */
      }
    },
    [segmentSize],
  );

  /**
   * 【步骤 7：布局参数计算】
   */
  // 整个列表的逻辑总高度
  const phantomHeight =
    segments.current.length > 0
      ? segments.current[segments.current.length - 1].top +
        segments.current[segments.current.length - 1].totalHeight
      : 0;

  // 计算渲染切片
  const renderStart = Math.max(0, start - bufferCount);
  const renderEnd = Math.min(listData.length, start + 12 + bufferCount);
  const visibleData = listData.slice(renderStart, renderEnd);

  // 查找 renderStart 对应的物理起点
  const getAbsoluteTop = (idx: number) => {
    const sIdx = Math.floor(idx / segmentSize);
    const iIdx = idx % segmentSize;
    const seg = segments.current[sIdx];
    return seg ? seg.top + seg.items[iIdx].top : 0;
  };
  const startOffset = getAbsoluteTop(renderStart);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        height: containerHeight,
        overflow: "hidden", // 禁用原生滚动
        position: "relative",
        background: "var(--bg-layout)",
      }}
    >
      {/* 
         自定义滚动条：
         它是平滑体验的核心。它只负责“用户想滚动到哪”。
      */}
      <CustomScrollbar
        contentHeight={phantomHeight}
        containerHeight={containerHeight}
        scrollTop={scrollTop}
        onScroll={setScrollTop}
      />

      {/* 
         渲染层：
         使用 translate3d 实现极致性能的位移。
         公式：当前渲染项的物理起点 - 当前滚动的逻辑位置
      */}
      <div
        style={{
          transform: `translate3d(0, ${startOffset - scrollTop}px, 0)`,
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
        }}
      >
        {visibleData.map((item, index) => (
          <SegmentedItem
            key={item.id}
            index={renderStart + index}
            content={item.content}
            onSizeChange={updatePositions}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 子组件：高度测量仪
 */
const SegmentedItem: React.FC<{
  index: number;
  content: string;
  onSizeChange: (idx: number, h: number) => void;
}> = ({ index, content, onSizeChange }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (nodeRef.current) {
      // 测量并上报
      onSizeChange(index, nodeRef.current.offsetHeight);
    }
  }, [content, index, onSizeChange]);

  return (
    <div
      ref={nodeRef}
      style={{
        padding: "16px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-card)",
        wordBreak: "break-all",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        <span
          style={{
            background: "var(--accent-color)",
            color: "var(--text-on-dark)",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          INDEX: {index}
        </span>
      </div>
      <div style={{ color: "var(--text-main)", lineHeight: "1.5" }}>
        {content}
      </div>
    </div>
  );
};
