import { FC, useRef, useState } from "react";

interface VirtualListProps {
  // 数据
  listData: Array<any>;
  // 配置每个高度
  itemHeight: number;
  // 可视区高度
  containerHight: number;
  // 缓冲区避免白屏
  bufferCount: number;
}

export const VirtualList: FC<VirtualListProps> = ({
  listData,
  itemHeight,
  containerHight,
  bufferCount,
}) => {
  const currentRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);

  const visibleCount = Math.ceil(containerHight / itemHeight);
  const renderStart = Math.max(0, start - bufferCount);
  const renderEnd = Math.min(
    listData.length,
    start + visibleCount + bufferCount,
  );

  const renderData = listData.slice(renderStart, renderEnd);
  const offset = renderStart * itemHeight;

  const handleScroll = () => {
    const scrollTop = currentRef.current?.scrollTop || 0;
    setStart(Math.floor(scrollTop / itemHeight));
  };

  return (
    <div
      ref={currentRef}
      style={{
        width: "100%",
        height: `${containerHight}px`,
        overflow: "auto",
        position: "relative",
        background: "var(--bg-card)",
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${listData.length * itemHeight}px`,
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          transform: `translate3d(0, ${offset}px, 0)`,
        }}
      >
        {renderData.map((item, index) => (
          <div
            key={item.id}
            style={{
              height: `${itemHeight}px`,
              background: "var(--bg-card)",
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
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};
