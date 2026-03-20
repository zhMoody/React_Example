import React, {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo,
} from "react";
import CustomScrollbar from "./CustomScrollbar";
import { JumpAlign } from "../types/Enum";

interface ListItem {
  id: number | string;
  content: string;
}

interface EditableVirtualListProps {
  initialData: ListItem[];
  estimatedItemHeight?: number;
  containerHeight?: number;
  bufferCount?: number;
  segmentSize?: number;
}

export interface EditableListRef {
  scrollToIndex: (index: number, align?: JumpAlign) => void;
  scrollToId: (id: string | number, align?: JumpAlign) => void;
  addItem: (index?: number) => void;
}

interface ItemPosition {
  height: number;
  top: number;
  bottom: number;
}

interface Segment {
  startIndex: number;
  totalHeight: number;
  top: number;
  items: ItemPosition[];
}

const EditableVirtualList = forwardRef<
  EditableListRef,
  EditableVirtualListProps
>(
  (
    {
      initialData,
      estimatedItemHeight = 100,
      containerHeight = 650,
      bufferCount = 10,
      segmentSize = 100,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const [listData, setListData] = useState<ListItem[]>(initialData);
    const [scrollTop, setScrollTop] = useState(0);
    const [layoutTick, setLayoutTick] = useState(0);

    const segments = useRef<Segment[]>([]);
    const measuredHeights = useRef<Map<string | number, number>>(new Map());
    const prevListRef = useRef<ListItem[]>(initialData);

    const [pendingJump, setPendingJump] = useState<{
      targetId: string | number;
      align: JumpAlign;
      count: number;
      originalIndex: number;
    } | null>(null);

    const [focusTargetId, setFocusTargetId] = useState<string | number | null>(
      null,
    );

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const blockNativeScroll = () => {
        if (container.scrollTop !== 0) container.scrollTop = 0;
        if (container.scrollLeft !== 0) container.scrollLeft = 0;
      };

      container.addEventListener("scroll", blockNativeScroll, {
        passive: true,
        capture: true,
      });
      return () =>
        container.removeEventListener("scroll", blockNativeScroll, {
          capture: true,
        });
    }, []);

    const idToIndexMap = useMemo(() => {
      const map = new Map<string | number, number>();
      for (let i = 0; i < listData.length; i++) {
        map.set(listData[i].id, i);
      }
      return map;
    }, [listData]);

    const rebuildSegments = useCallback(
      (currentListData: ListItem[]) => {
        const newSegments: Segment[] = [];
        let currentTop = 0;
        for (let i = 0; i < currentListData.length; i += segmentSize) {
          const end = Math.min(i + segmentSize, currentListData.length);
          const count = end - i;
          const items: ItemPosition[] = [];
          let innerTop = 0;
          for (let j = 0; j < count; j++) {
            const item = currentListData[i + j];
            const h =
              measuredHeights.current.get(item.id) || estimatedItemHeight;
            items.push({ height: h, top: innerTop, bottom: innerTop + h });
            innerTop += h;
          }
          newSegments.push({
            startIndex: i,
            totalHeight: innerTop,
            top: currentTop,
            items,
          });
          currentTop += innerTop;
        }
        segments.current = newSegments;
      },
      [estimatedItemHeight, segmentSize],
    );

    if (
      prevListRef.current.length !== listData.length ||
      segments.current.length === 0
    ) {
      if (listData.length > 0) rebuildSegments(listData);
      prevListRef.current = listData;
    }

    const getPhantomHeight = useCallback(() => {
      const segs = segments.current;
      if (segs.length === 0) return 0;
      const lastSeg = segs[segs.length - 1];
      return lastSeg.top + lastSeg.totalHeight;
    }, [layoutTick]);

    const currentPhantomHeight = getPhantomHeight();

    const getPosById = useCallback(
      (id: string | number) => {
        const index = idToIndexMap.get(id);
        if (index === undefined) return null;
        const sIdx = Math.floor(index / segmentSize);
        const iIdx = index % segmentSize;
        const seg = segments.current[sIdx];
        if (!seg || !seg.items[iIdx]) return null;
        return {
          index,
          top: seg.top + seg.items[iIdx].top,
          height: seg.items[iIdx].height,
          id,
        };
      },
      [idToIndexMap, segmentSize, layoutTick],
    );

    const scrollToId = useCallback(
      (id: string | number, align: JumpAlign = JumpAlign.START) => {
        if (segments.current.length === 0) rebuildSegments(listData);
        const pos = getPosById(id);
        if (pos) {
          let target = pos.top;
          if (align === "center") target -= (containerHeight - pos.height) / 2;
          else if (align === "end") target -= containerHeight - pos.height;

          const maxST = Math.max(0, getPhantomHeight() - containerHeight);
          const finalST = Math.max(0, Math.min(target, maxST));

          setScrollTop(finalST);
          setPendingJump({
            targetId: id,
            align,
            count: 0,
            originalIndex: pos.index,
          });
        }
      },
      [
        containerHeight,
        getPosById,
        rebuildSegments,
        getPhantomHeight,
        listData,
      ],
    );

    const scrollToIndex = useCallback(
      (index: number, align: JumpAlign = JumpAlign.START) => {
        const item = listData[index];
        if (!item) return;
        scrollToId(item.id, align);
      },
      [listData, scrollToId],
    );

    useLayoutEffect(() => {
      if (pendingJump) {
        const { align, count, targetId } = pendingJump;
        const pos = getPosById(targetId);
        if (pos) {
          let target = pos.top;
          if (align === "center") target -= (containerHeight - pos.height) / 2;
          else if (align === "end") target -= containerHeight - pos.height;

          const maxST = Math.max(0, getPhantomHeight() - containerHeight);
          const finalST = Math.max(0, Math.min(target, maxST));

          if (Math.abs(finalST - scrollTop) > 0.5 || count < 4) {
            if (Math.abs(finalST - scrollTop) > 0.5) {
              setScrollTop(finalST);
            }
            if (count < 15) {
              setPendingJump({ ...pendingJump, count: count + 1 });
            } else {
              setPendingJump(null);
            }
          } else {
            setPendingJump(null);
          }
        }
      }
    }, [
      scrollTop,
      layoutTick,
      containerHeight,
      getPhantomHeight,
      getPosById,
      pendingJump,
    ]);

    const findStartIndex = useCallback((st: number) => {
      const segs = segments.current;
      if (segs.length === 0) return 0;
      let sL = 0,
        sR = segs.length - 1,
        sIdx = 0;
      while (sL <= sR) {
        const m = Math.floor((sL + sR) / 2);
        if (segs[m].top <= st) {
          sIdx = m;
          sL = m + 1;
        } else sR = m - 1;
      }
      const segment = segs[sIdx];
      if (!segment) return 0;
      const internalST = st - segment.top;
      let iL = 0,
        iR = segment.items.length - 1,
        iIdx = 0;
      while (iL <= iR) {
        const m = Math.floor((iL + iR) / 2);
        if (segment.items[m].bottom > internalST) {
          iIdx = m;
          iR = m - 1;
        } else iL = m + 1;
      }
      return segment.startIndex + iIdx;
    }, []);

    const addItem = (index?: number) => {
      const targetIdx = index !== undefined ? index + 1 : listData.length;
      const newId = `item-${Date.now()}-${Math.random()}`;
      const currentStartIdx = findStartIndex(scrollTop);
      if (targetIdx <= currentStartIdx) {
        setScrollTop((prev) => prev + estimatedItemHeight);
      }
      setListData((prev) => {
        const next = [...prev];
        next.splice(targetIdx, 0, { id: newId, content: "" });
        return next;
      });
      setFocusTargetId(newId);
    };

    const deleteItem = (index: number) => {
      const item = listData[index];
      let itemHeight = estimatedItemHeight;
      if (item) {
        itemHeight =
          measuredHeights.current.get(item.id) || estimatedItemHeight;
        measuredHeights.current.delete(item.id);
      }
      const currentStartIdx = findStartIndex(scrollTop);
      if (index <= currentStartIdx) {
        setScrollTop((prev) => Math.max(0, prev - itemHeight));
      }
      setListData((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
    };

    const updateItem = (index: number, val: string) => {
      setListData((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], content: val };
        return next;
      });
    };

    useLayoutEffect(() => {
      const ph = getPhantomHeight();
      const maxST = Math.max(0, ph - containerHeight);
      if (scrollTop > maxST && listData.length > 0) {
        setScrollTop(maxST);
      }
    }, [containerHeight, scrollTop, listData.length, getPhantomHeight]);

    const start = findStartIndex(scrollTop);
    const renderStart = Math.max(0, start - bufferCount);
    const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);
    const renderEnd = Math.min(
      listData.length,
      start + visibleCount + bufferCount,
    );
    const visibleData = listData.slice(renderStart, renderEnd);

    const updatePositions = useCallback(
      (globalIdx: number, h: number) => {
        const item = listData[globalIdx];
        if (!item) return;
        const sIdx = Math.floor(globalIdx / segmentSize);
        const iIdx = globalIdx % segmentSize;
        const seg = segments.current[sIdx];
        if (!seg || !seg.items[iIdx]) return;

        const dValue = h - seg.items[iIdx].height;
        if (Math.abs(dValue) <= 0.1) return;

        measuredHeights.current.set(item.id, h);
        seg.items[iIdx].height = h;
        seg.items[iIdx].bottom += dValue;
        for (let i = iIdx + 1; i < seg.items.length; i++) {
          seg.items[i].top += dValue;
          seg.items[i].bottom += dValue;
        }
        seg.totalHeight += dValue;
        for (let j = sIdx + 1; j < segments.current.length; j++) {
          segments.current[j].top += dValue;
        }
        setLayoutTick((t) => t + 1);
      },
      [segmentSize, listData],
    );

    const startOffset =
      segments.current[Math.floor(renderStart / segmentSize)]?.top +
        (segments.current[Math.floor(renderStart / segmentSize)]?.items[
          renderStart % segmentSize
        ]?.top || 0) || 0;

    useImperativeHandle(ref, () => ({ scrollToIndex, scrollToId, addItem }), [
      scrollToIndex,
      scrollToId,
      listData.length,
    ]);

    const onFlashEnd = useCallback(() => setFocusTargetId(null), []);

    return (
      <div
        ref={containerRef} // 必须绑定：提供原生滚动监控基准
        onWheel={(e) =>
          setScrollTop((s) =>
            Math.max(
              0,
              Math.min(s + e.deltaY, getPhantomHeight() - containerHeight),
            ),
          )
        }
        style={{
          height: containerHeight,
          overflow: "hidden",
          position: "relative",
          background: "#f8f9fa",
          border: "1px solid #ddd",
        }}
      >
        <CustomScrollbar
          contentHeight={currentPhantomHeight}
          containerHeight={containerHeight}
          scrollTop={scrollTop}
          onScroll={setScrollTop}
        />
        <div
          style={{
            transform: `translate3d(0, ${startOffset - scrollTop}px, 0)`,
            position: "absolute",
            width: "100%",
          }}
        >
          {visibleData.map((item, idx) => (
            <EditableItem
              key={item.id}
              id={item.id}
              index={renderStart + idx}
              content={item.content}
              shouldFlash={focusTargetId === item.id}
              onFlashEnd={onFlashEnd}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onAdd={addItem}
              onSizeChange={updatePositions}
            />
          ))}
        </div>
      </div>
    );
  },
);

const EditableItem: React.FC<{
  id: string | number;
  index: number;
  content: string;
  shouldFlash: boolean;
  onFlashEnd: () => void;
  onUpdate: (idx: number, val: string) => void;
  onDelete: (idx: number) => void;
  onAdd: (idx: number) => void;
  onSizeChange: (idx: number, h: number) => void;
}> = React.memo(
  ({
    id,
    index,
    content,
    shouldFlash,
    onFlashEnd,
    onUpdate,
    onDelete,
    onAdd,
    onSizeChange,
  }) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [localValue, setLocalValue] = useState(content);
    const [isFlashActive, setIsFlashActive] = useState(false);

    useEffect(() => setLocalValue(content), [content]);

    useEffect(() => {
      if (shouldFlash) {
        setIsFlashActive(true);
        if (textRef.current) textRef.current.focus();
        const timer = setTimeout(() => {
          setIsFlashActive(false);
          onFlashEnd();
        }, 1000);
        return () => {
          clearTimeout(timer);
          setIsFlashActive(false);
        };
      } else {
        setIsFlashActive(false);
      }
    }, [shouldFlash, onFlashEnd]);

    const autoResize = useCallback(() => {
      const el = textRef.current;
      if (!el) return;

      el.style.height = "1px";
      const newScrollHeight = el.scrollHeight;
      el.style.height = `${newScrollHeight}px`;

      if (nodeRef.current) {
        onSizeChange(index, nodeRef.current.offsetHeight);
      }
    }, [index, onSizeChange]);

    useLayoutEffect(() => {
      autoResize();
    }, [localValue, autoResize]);

    return (
      <div
        ref={nodeRef}
        style={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          background: isFlashActive ? "#e6f7ff" : "#fff",
          transition: "background 0.5s ease-out",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                background: "#4A90E2",
                color: "#fff",
                padding: "1px 6px",
                borderRadius: "3px",
                fontSize: "11px",
              }}
            >
              INDEX: {index}
            </span>
            <span
              style={{
                background: "#8e44ad",
                color: "#fff",
                padding: "1px 6px",
                borderRadius: "3px",
                fontSize: "11px",
              }}
            >
              ID: {id}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onAdd(index)}
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                cursor: "pointer",
                background: "#f0f9eb",
                border: "1px solid #c2e7b0",
                color: "#67c23a",
                borderRadius: "4px",
              }}
            >
              + 插入
            </button>
            <button
              onClick={() => onDelete(index)}
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                cursor: "pointer",
                background: "#fef0f0",
                border: "1px solid #fbc4c4",
                color: "#f56c6c",
                borderRadius: "4px",
              }}
            >
              删除
            </button>
          </div>
        </div>
        <textarea
          ref={textRef}
          rows={1}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onUpdate(index, localValue)}
          placeholder="输入内容..."
          style={{
            width: "100%",
            padding: "10px 14px",
            border: isFlashActive ? "1px solid #4A90E2" : "1px solid #dcdfe6",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            resize: "none",
            overflow: "hidden",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            wordWrap: "break-word",
            fontFamily: "inherit",
            background: "transparent",
          }}
        />
      </div>
    );
  },
);

export default EditableVirtualList;
