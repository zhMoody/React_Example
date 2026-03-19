import React, {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import CustomScrollbar from "./CustomScrollbar";

/**
 * 【CRUD 动态高度虚拟列表】
 *
 * 核心设计哲学：
 * 1. 地图化思想：将 10 万条数据映射为物理坐标（Segments），分片管理以提升计算效率。
 * 2. ID 记忆：通过 Map 记录每个 ID 的真实高度，解决因增删导致的索引错位问题。
 * 3. 随动下推：中间插入时锁定 scrollTop，靠数据更新后物理坐标的自然增长实现“推开”效果。
 */

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
  scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
  addItem: (index?: number) => void;
}

// 分片结构：将列表切块，每块维护自己的总高度和内部项的相对位置
interface Segment {
  startIndex: number; // 该分片的起始数据索引
  totalHeight: number; // 整个分片的物理高度（像素）
  top: number; // 该分片顶部距离整个列表顶部的距离
  items: ItemPosition[]; // 内部每一项的详细坐标
}

interface ItemPosition {
  height: number; // 项的高度（初始为预估，测量后为真实）
  top: number; // 相对于所属分片顶部的偏移
  bottom: number; // 相对于所属分片顶部的偏移
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
      segmentSize = 1000,
    },
    ref,
  ) => {
    // --- 状态与引用 ---
    const [listData, setListData] = useState<ListItem[]>(initialData); // 原始数据源
    const [scrollTop, setScrollTop] = useState(0); // 核心驱动状态：当前滚动的逻辑位移
    const segments = useRef<Segment[]>([]); // 物理地图：使用 Ref 避免 React Diff 大数组
    const measuredHeights = useRef<Map<string | number, number>>(new Map()); // 高度记忆地图

    // 追踪跳转目标，用于跳转后的“二次像素级对齐”
    const [pendingJump, setPendingJump] = useState<{
      index: number;
      align: "start" | "center" | "end";
      count: number;
      targetId: string | number;
    } | null>(null);

    // 记录最新操作的 ID，用于自动聚焦新插入的项
    const [focusTargetId, setFocusTargetId] = useState<string | number | null>(
      null,
    );

    /**
     * 【步骤 1：构建物理地图】
     * 将 listData 按照 segmentSize 分成若干块。
     * 这样做的好处是：当某一项高度变化时，只需要修正所属分片和后续分片的 top 值，不需要循环 10 万次。
     */
    const rebuildSegments = useCallback(() => {
      const newSegments: Segment[] = [];
      let currentTop = 0;

      for (let i = 0; i < listData.length; i += segmentSize) {
        const end = Math.min(i + segmentSize, listData.length);
        const count = end - i;
        const items: ItemPosition[] = [];
        let innerTop = 0;

        for (let j = 0; j < count; j++) {
          const item = listData[i + j];
          // 关键：优先从记忆地图中获取该 ID 曾经测量过的高度
          const h = measuredHeights.current.get(item.id) || estimatedItemHeight;
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
    }, [listData, estimatedItemHeight, segmentSize]);

    // 如果地图是空的（初始化或增删后），立即同步重建
    if (segments.current.length === 0 && listData.length > 0) {
      rebuildSegments();
    }

    // 计算列表逻辑总高度（即滚动条能滚动的最大范围）
    const phantomHeight =
      segments.current.length > 0
        ? segments.current[segments.current.length - 1].top +
          segments.current[segments.current.length - 1].totalHeight
        : 0;

    /**
     * 【步骤 2：数据操作与逻辑推移】
     */
    const addItem = (index?: number) => {
      const targetIdx = index !== undefined ? index + 1 : listData.length;
      const newId = `item-${Date.now()}-${Math.random()}`;

      setListData((prev) => {
        const next = [...prev];
        next.splice(targetIdx, 0, { id: newId, content: "" });
        return next;
      });

      // 标记地图需要重构。注意：此处不修改 scrollTop。
      // 由于新项插入点之后的 top 会在下一次 rebuildSegments 时变大，
      // 而 scrollTop 没变，视觉上就会产生“下方内容自然下移”的效果。
      segments.current = [];
      setFocusTargetId(newId);
    };

    const deleteItem = (index: number) => {
      const item = listData[index];
      if (item) measuredHeights.current.delete(item.id); // 删除高度记忆
      setListData((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      segments.current = [];
    };

    const updateItem = (index: number, val: string) => {
      setListData((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], content: val };
        return next;
      });
    };

    /**
     * 【步骤 3：二分查找与定位】
     * 目标：根据当前的位移 st，计算出屏幕顶部应该显示哪一项。
     */
    const findStartIndex = (st: number) => {
      const segs = segments.current;
      if (segs.length === 0) return 0;

      // 1. 在分片层找： st 落在哪个分片内？
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

      // 2. 在项层找：st 落在该分片的哪一项内？
      const segment = segs[sIdx];
      const internalST = st - segment.top; // 转化为分片内相对位移
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
    };

    /**
     * 【步骤 4：渲染切片计算】
     * 确定当前 DOM 中应该挂载哪些项。
     */
    const start = findStartIndex(scrollTop); // 可视区第一项索引
    const renderStart = Math.max(0, start - bufferCount); // 向上扩充缓冲区
    const visibleCount = Math.ceil(containerHeight / estimatedItemHeight); // 一屏大约几条
    const renderEnd = Math.min(
      listData.length,
      start + visibleCount + bufferCount,
    ); // 向下扩充缓冲区
    const visibleData = listData.slice(renderStart, renderEnd); // 精准切割数据

    /**
     * 【步骤 5：位置修正回调】
     * 当子组件 Item 渲染后，测量得到真实高度，上报给父组件。
     */
    const updatePositions = useCallback(
      (globalIdx: number, h: number) => {
        const item = listData[globalIdx];
        if (!item) return;
        measuredHeights.current.set(item.id, h); // 1. 记入永久记忆

        const sIdx = Math.floor(globalIdx / segmentSize);
        const iIdx = globalIdx % segmentSize;
        const seg = segments.current[sIdx];
        if (!seg || !seg.items[iIdx]) return;

        const dValue = h - seg.items[iIdx].height; // 计算真实高度与地图记录的差值
        if (Math.abs(dValue) > 0.1) {
          // 2. 修正分片内部：该项及后续项的相对坐标
          seg.items[iIdx].height = h;
          seg.items[iIdx].bottom = seg.items[iIdx].top + h;
          for (let i = iIdx + 1; i < seg.items.length; i++) {
            seg.items[i].top = seg.items[i - 1].bottom;
            seg.items[i].bottom = seg.items[i].top + seg.items[i].height;
          }
          // 3. 修正分片总高度：
          const oldTotal = seg.totalHeight;
          seg.totalHeight = seg.items[seg.items.length - 1].bottom;
          const diff = seg.totalHeight - oldTotal;
          // 4. 修正后续分片：所有后续分片的 top 值整体偏移
          for (let j = sIdx + 1; j < segments.current.length; j++) {
            segments.current[j].top += diff;
          }
        }
      },
      [segmentSize, listData],
    );

    /**
     * 【步骤 6：物理渲染偏移】
     * 核心公式：渲染层位移 = renderStart 第一项的物理绝对 top - 当前滚动的位移 scrollTop
     */
    const getAbsoluteTop = (idx: number) => {
      const sIdx = Math.floor(idx / segmentSize);
      const iIdx = idx % segmentSize;
      const seg = segments.current[sIdx];
      if (!seg || !seg.items[iIdx]) return 0;
      return seg.top + seg.items[iIdx].top;
    };
    const startOffset = getAbsoluteTop(renderStart);

    /**
     * 【步骤 7：外部命令暴露】
     */
    const scrollToIndex = useCallback(
      (index: number, align: "start" | "center" | "end" = "start") => {
        const sIdx = Math.floor(index / segmentSize);
        const iIdx = index % segmentSize;
        const seg = segments.current[sIdx];
        if (!seg || !seg.items[iIdx]) return;
        const item = seg.items[iIdx];
        let target = seg.top + item.top;
        if (align === "center") target -= (containerHeight - item.height) / 2;
        else if (align === "end") target -= containerHeight - item.height;

        const finalST = Math.max(
          0,
          Math.min(target, phantomHeight - containerHeight),
        );
        setScrollTop(finalST);
        // 开启追踪，应对跳转后的测量修正
        setPendingJump({
          index,
          align,
          count: 0,
          targetId: listData[index].id,
        });
      },
      [containerHeight, phantomHeight, segmentSize, listData],
    );

    useImperativeHandle(ref, () => ({ scrollToIndex, addItem }), [
      scrollToIndex,
      listData.length,
    ]);

    // 跳转后的微调校准
    useLayoutEffect(() => {
      if (pendingJump) {
        const { align, count, targetId } = pendingJump;
        const curIdx = listData.findIndex((it) => it.id === targetId);
        const sIdx = Math.floor(curIdx / segmentSize);
        const iIdx = curIdx % segmentSize;
        const seg = segments.current[sIdx];
        if (seg && seg.items[iIdx]) {
          const item = seg.items[iIdx];
          let target = seg.top + item.top;
          if (align === "center") target -= (containerHeight - item.height) / 2;
          else if (align === "end") target -= containerHeight - item.height;
          const finalST = Math.max(
            0,
            Math.min(target, phantomHeight - containerHeight),
          );
          if (Math.abs(finalST - scrollTop) > 0.5 && count < 8) {
            setScrollTop(finalST);
            setPendingJump({ ...pendingJump, index: curIdx, count: count + 1 });
          } else {
            setPendingJump(null);
          }
        }
      }
    });

    const onFlashEnd = useCallback(() => setFocusTargetId(null), []);

    return (
      <div
        onWheel={(e) =>
          setScrollTop((s) =>
            Math.max(
              0,
              Math.min(s + e.deltaY, phantomHeight - containerHeight),
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
        {/* 自定义滚动条 */}
        <CustomScrollbar
          contentHeight={phantomHeight}
          containerHeight={containerHeight}
          scrollTop={scrollTop}
          onScroll={setScrollTop}
        />

        {/* 渲染层：使用 translate3d 提高性能 */}
        <div
          style={{
            transform: `translate3d(0, ${startOffset - scrollTop}px, 0)`,
            position: "absolute",
            width: "100%",
          }}
        >
          {visibleData.map((item, idx) => (
            <EditableItem
              key={item.id} // 稳定 Key 保证 React 正确复用 DOM
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

/**
 * 【子组件：高度变压器】
 * 每一个 Item 负责根据文字量撑开高度，并实时回传给父组件。
 */
const EditableItem: React.FC<{
  index: number;
  content: string;
  shouldFlash: boolean;
  onFlashEnd: () => void;
  onUpdate: (idx: number, val: string) => void;
  onDelete: (idx: number) => void;
  onAdd: (idx: number) => void;
  onSizeChange: (idx: number, h: number) => void;
}> = ({
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

  // 处理新增时的闪烁引导
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

  /**
   * 【核心高度逻辑】
   * 模拟 TextArea 的高度自适应：重置 -> 读取 scrollHeight -> 设置物理高度 -> 上报父组件
   */
  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (nodeRef.current) onSizeChange(index, nodeRef.current.offsetHeight);
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
          wordBreak: "break-all",
          fontFamily: "inherit",
          background: "transparent",
        }}
      />
    </div>
  );
};

export default EditableVirtualList;
