import { useState, useRef, useLayoutEffect, useCallback } from "react";
import CustomScrollbar from "./CustomScrollbar";

/**
 * 【分片式虚拟列表 + 自定义滚动条】
 */

interface ListItem {
  id: number | string;
  content?: string;
  [key: string]: any;
}

interface SegmentedVirtualListProps {
  listData: ListItem[];
  estimatedItemHeight: number;
  containerHeight: number | string;
  bufferCount: number;
  segmentSize?: number;
  renderItem?: (item: any, index: number) => React.ReactNode;
}

interface Segment {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  top: number;
  items: ItemPosition[];
}

interface ItemPosition {
  height: number;
  top: number;
  bottom: number;
}

export const SegmentedVirtualList: React.FC<SegmentedVirtualListProps> = ({
  listData,
  estimatedItemHeight = 50,
  containerHeight = 600,
  bufferCount = 5,
  segmentSize = 1000,
  renderItem,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useRef<Segment[]>([]);
  const [actualContainerHeight, setActualContainerHeight] = useState(0);

  // 1. 同步容器高度
  useLayoutEffect(() => {
    if (typeof containerHeight === "string" && containerRef.current) {
      setActualContainerHeight(containerRef.current.offsetHeight);
    } else if (typeof containerHeight === "number") {
      setActualContainerHeight(containerHeight);
    }
  }, [containerHeight]);

  // 2. 初始化/重置地图
  const initSegments = useCallback(() => {
    const newSegments: Segment[] = [];
    for (let i = 0; i < listData.length; i += segmentSize) {
      const end = Math.min(i + segmentSize, listData.length);
      const count = end - i;
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

  // 数据长度变化时强制重置，确保不会索引越界
  const lastLength = useRef(listData.length);
  if (segments.current.length === 0 || listData.length !== lastLength.current) {
    initSegments();
    lastLength.current = listData.length;
  }

  // 3. 核心查找算法
  const findStartIndex = (st: number) => {
    if (segments.current.length === 0) return 0;
    let sLeft = 0,
      sRight = segments.current.length - 1,
      sIdx = 0;
    while (sLeft <= sRight) {
      const mid = Math.floor((sLeft + sRight) / 2);
      if (segments.current[mid].top <= st) {
        sIdx = mid;
        sLeft = mid + 1;
      } else {
        sRight = mid - 1;
      }
    }

    const segment = segments.current[sIdx];
    if (!segment) return 0;
    const internalST = st - segment.top;
    let iLeft = 0,
      iRight = segment.items.length - 1,
      iIdx = 0;
    while (iLeft <= iRight) {
      const mid = Math.floor((iLeft + iRight) / 2);
      if (segment.items[mid].bottom > internalST) {
        iIdx = mid;
        iRight = mid - 1;
      } else {
        iLeft = mid + 1;
        iIdx = mid;
      }
    }
    return segment.startIndex + iIdx;
  };

  const start = findStartIndex(scrollTop);

  const handleWheel = (e: React.WheelEvent) => {
    const newST = scrollTop + e.deltaY;
    const maxST = phantomHeight - actualContainerHeight;
    setScrollTop(Math.max(0, Math.min(newST, maxST)));
  };

  // 4. 位置修正
  const updatePositions = useCallback(
    (globalIndex: number, height: number) => {
      const sIdx = Math.floor(globalIndex / segmentSize);
      const iIdx = globalIndex % segmentSize;
      const segment = segments.current[sIdx];

      // 如果段落不存在或索引越界，直接返回
      if (!segment || !segment.items || !segment.items[iIdx]) return;

      const item = segment.items[iIdx];
      const dValue = height - item.height;

      if (Math.abs(dValue) > 0.1) {
        item.height = height;
        item.bottom = item.top + height;
        for (let i = iIdx + 1; i < segment.items.length; i++) {
          segment.items[i].top = segment.items[i - 1].bottom;
          segment.items[i].bottom =
            segment.items[i].top + segment.items[i].height;
        }

        const oldTotal = segment.totalHeight;
        segment.totalHeight = segment.items[segment.items.length - 1].bottom;
        const actualDiff = segment.totalHeight - oldTotal;

        for (let j = sIdx + 1; j < segments.current.length; j++) {
          segments.current[j].top += actualDiff;
        }
      }
    },
    [segmentSize],
  );

  const phantomHeight =
    segments.current.length > 0
      ? segments.current[segments.current.length - 1].top +
        segments.current[segments.current.length - 1].totalHeight
      : 0;

  const renderStart = Math.max(0, start - bufferCount);
  const visibleCount =
    Math.ceil(actualContainerHeight / estimatedItemHeight) || 10;
  const renderEnd = Math.min(
    listData.length,
    start + visibleCount + bufferCount,
  );
  const visibleData = listData.slice(renderStart, renderEnd);

  const getAbsoluteTop = (idx: number) => {
    const sIdx = Math.floor(idx / segmentSize);
    const iIdx = idx % segmentSize;
    const seg = segments.current[sIdx];
    return seg && seg.items[iIdx] ? seg.top + seg.items[iIdx].top : 0;
  };
  const startOffset = getAbsoluteTop(renderStart);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        height:
          typeof containerHeight === "number"
            ? `${containerHeight}px`
            : containerHeight,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <CustomScrollbar
        contentHeight={phantomHeight}
        containerHeight={actualContainerHeight}
        scrollTop={scrollTop}
        onScroll={setScrollTop}
      />

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
            item={item}
            renderItem={renderItem}
            onSizeChange={updatePositions}
          />
        ))}
      </div>
    </div>
  );
};

const SegmentedItem: React.FC<{
  index: number;
  item: any;
  renderItem?: (item: any, index: number) => React.ReactNode;
  onSizeChange: (idx: number, h: number) => void;
}> = ({ index, item, renderItem, onSizeChange }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (nodeRef.current) {
      onSizeChange(index, nodeRef.current.offsetHeight);
    }
  }, [item, index, onSizeChange]);

  return (
    <div ref={nodeRef} style={{ boxSizing: "border-box", width: "100%" }}>
      {renderItem ? (
        renderItem(item, index)
      ) : (
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            wordBreak: "break-all",
          }}
        >
          {item.content || `Item ${index}`}
        </div>
      )}
    </div>
  );
};
