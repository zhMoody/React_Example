import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import CustomScrollbar from "./CustomScrollbar";
import { JumpAlign } from "../../types/Enum";

/**
 * 【精准定位版】分片式虚拟列表
 * 增加“二次校准”逻辑，解决动态高度跳转不准的问题。
 */

interface ListItem {
  id: number | string;
  content: string;
}

interface IncrementalVirtualListProps {
  listData: ListItem[];
  estimatedItemHeight?: number;
  containerHeight?: number;
  bufferCount?: number;
  segmentSize?: number;
}

export interface IncrementalListRef {
  scrollToIndex: (index: number, align?: JumpAlign) => void;
  getScrollTop: () => number;
}

interface Segment {
  startIndex: number;
  totalHeight: number;
  top: number;
  items: ItemPosition[];
}

interface ItemPosition {
  height: number;
  top: number;
  bottom: number;
}

export const IncrementalVirtualList = forwardRef<
  IncrementalListRef,
  IncrementalVirtualListProps
>(
  (
    {
      listData,
      estimatedItemHeight = 50,
      containerHeight = 600,
      bufferCount = 5,
      segmentSize = 1000,
    },
    ref,
  ) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const segments = useRef<Segment[]>([]);
    const lastDataLength = useRef(0);

    // 用于二次校准的状态
    const [pendingJump, setPendingJump] = useState<{
      index: number;
      align: JumpAlign;
      count: number; // 尝试校准的次数，通常 1-2 次即可完美对齐
    } | null>(null);

    /**
     * 初始化/增量更新地图
     */
    const updateSegments = useCallback(() => {
      const currentLength = listData.length;
      let processed = lastDataLength.current;
      if (currentLength <= processed) return;
      if (processed === 0) segments.current = [];

      const newSegments = [...segments.current];
      while (processed < currentLength) {
        const sIdx = Math.floor(processed / segmentSize);
        const segEnd = (sIdx + 1) * segmentSize;
        const batchEnd = Math.min(segEnd, currentLength);
        const countInThisBatch = batchEnd - processed;

        if (!newSegments[sIdx]) {
          const items: ItemPosition[] = [];
          for (let k = 0; k < countInThisBatch; k++) {
            items.push({
              height: estimatedItemHeight,
              top: k * estimatedItemHeight,
              bottom: (k + 1) * estimatedItemHeight,
            });
          }
          const prevSeg = newSegments[sIdx - 1];
          const prevBottom = prevSeg ? prevSeg.top + prevSeg.totalHeight : 0;
          newSegments[sIdx] = {
            startIndex: sIdx * segmentSize,
            totalHeight: items.length * estimatedItemHeight,
            top: prevBottom,
            items,
          };
        } else {
          const seg = newSegments[sIdx];
          for (let k = 0; k < countInThisBatch; k++) {
            const lastItem = seg.items[seg.items.length - 1];
            const prevBottom = lastItem ? lastItem.bottom : 0;
            seg.items.push({
              height: estimatedItemHeight,
              top: prevBottom,
              bottom: prevBottom + estimatedItemHeight,
            });
          }
          seg.totalHeight = seg.items[seg.items.length - 1].bottom;
        }
        processed = batchEnd;
      }
      segments.current = newSegments;
      lastDataLength.current = currentLength;
    }, [listData, estimatedItemHeight, segmentSize]);

    if (listData.length !== lastDataLength.current) {
      updateSegments();
    }

    /**
     * 计算指定索引的理想滚动位置
     */
    const getTargetScrollTop = useCallback(
      (index: number, align: JumpAlign) => {
        const sIdx = Math.floor(index / segmentSize);
        const iIdx = index % segmentSize;
        const segment = segments.current[sIdx];
        if (!segment || !segment.items[iIdx]) return null;

        const item = segment.items[iIdx];
        let target = segment.top + item.top;

        if (align === JumpAlign.CENTER) {
          target -= (containerHeight - item.height) / 2;
        } else if (align === JumpAlign.END) {
          target -= containerHeight - item.height;
        }
        return target;
      },
      [containerHeight, segmentSize],
    );

    /**
     * 执行跳转
     */
    const scrollToIndex = useCallback(
      (index: number, align: JumpAlign = JumpAlign.START) => {
        const target = getTargetScrollTop(index, align);
        if (target !== null) {
          const maxST = phantomHeight - containerHeight;
          const finalST = Math.max(0, Math.min(target, maxST));
          setScrollTop(finalST);
          // 标记需要校准
          setPendingJump({ index, align, count: 0 });
        }
      },
      [getTargetScrollTop, containerHeight],
    );

    /**
     * 【核心逻辑：自动对齐校准】
     * 当 pendingJump 存在时，每次组件重新渲染（通常是因为高度测量完毕），
     * 重新计算一遍目标位置。如果发现位置偏了，就再跳一次。
     */
    useLayoutEffect(() => {
      if (pendingJump) {
        const { index, align, count } = pendingJump;
        const target = getTargetScrollTop(index, align);

        if (target !== null) {
          const maxST = phantomHeight - containerHeight;
          const finalST = Math.max(0, Math.min(target, maxST));

          // 如果当前位置和目标位置差值超过 1 像素，则进行校准
          if (Math.abs(finalST - scrollTop) > 1 && count < 3) {
            setScrollTop(finalST);
            setPendingJump({ index, align, count: count + 1 });
          } else {
            // 对齐完成
            setPendingJump(null);
          }
        }
      }
    }); // 每一帧都检查，直到对齐或超过尝试次数

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex,
        getScrollTop: () => scrollTop,
      }),
      [scrollToIndex, scrollTop],
    );

    /**
     * 查找逻辑
     */
    const findStartIndex = (st: number) => {
      const segs = segments.current;
      if (segs.length === 0) return 0;
      let sLeft = 0,
        sRight = segs.length - 1,
        sIdx = 0;
      while (sLeft <= sRight) {
        const mid = Math.floor((sLeft + sRight) / 2);
        if (segs[mid].top <= st) {
          sIdx = mid;
          sLeft = mid + 1;
        } else {
          sRight = mid - 1;
        }
      }
      const segment = segs[sIdx];
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
      // 如果正在自动跳转，禁用手动滚轮，防止冲突
      if (pendingJump) return;

      const newST = scrollTop + e.deltaY;
      const maxST = phantomHeight - containerHeight;
      setScrollTop(Math.max(0, Math.min(newST, maxST)));
    };

    /**
     * 位置修正回调
     */
    const updatePositions = useCallback(
      (globalIndex: number, height: number) => {
        const sIdx = Math.floor(globalIndex / segmentSize);
        const iIdx = globalIndex % segmentSize;
        const segs = segments.current;
        const segment = segs[sIdx];
        if (!segment || !segment.items[iIdx]) return;

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
          for (let j = sIdx + 1; j < segs.length; j++) {
            segs[j].top += actualDiff;
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
    const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);
    const renderEnd = Math.min(
      listData.length,
      start + visibleCount + bufferCount,
    );
    const visibleData = listData.slice(renderStart, renderEnd);

    const getAbsoluteTop = (idx: number) => {
      const sIdx = Math.floor(idx / segmentSize);
      const iIdx = idx % segmentSize;
      const seg = segments.current[sIdx];
      if (!seg || !seg.items[iIdx]) return 0;
      return seg.top + seg.items[iIdx].top;
    };

    const startOffset = getAbsoluteTop(renderStart);

    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        style={{
          height: containerHeight,
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-layout)",
          border: "1px solid var(--border-color)",
        }}
      >
        <CustomScrollbar
          contentHeight={phantomHeight}
          containerHeight={containerHeight}
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
            <IncrementalItem
              key={item.id}
              index={renderStart + index}
              content={item.content}
              onSizeChange={updatePositions}
            />
          ))}
        </div>
      </div>
    );
  },
);

const IncrementalItem: React.FC<{
  index: number;
  content: string;
  onSizeChange: (idx: number, h: number) => void;
}> = ({ index, content, onSizeChange }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (nodeRef.current) {
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
      <div style={{ marginBottom: "4px" }}>
        <span
          style={{
            background: "var(--accent-color)",
            color: "var(--text-on-dark)",
            padding: "1px 6px",
            borderRadius: "3px",
            fontSize: "11px",
          }}
        >
          INDEX: {index}
        </span>
      </div>
      <div
        style={{
          color: "var(--text-main)",
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        {content}
      </div>
    </div>
  );
};
