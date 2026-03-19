import "./index.css";
import "./App.css";
import VirtualList from "./Components/VirtualList";
import DynamicVirtualList from "./Components/DynamicVirtualList";
import SegmentedVirtualList from "./Components/SegmentedVirtualList";
import IncrementalVirtualList, {
  IncrementalListRef,
} from "./Components/IncrementalVirtualList";
import { useMemo, useState, useRef } from "react";

const RANDOM_TEXTS = [
  "短小精悍。",
  "这是一段中等长度的描述文字，用于测试列表的撑开效果。",
  "【超长警告】这是一段非常非常非常长长长长长长长长长长长长长长长长长长长长长长长长长长长长的文字。它必然会触发换行，从而产生一个巨大的物理高度。这正是考验动态高度虚拟列表核心算法——位置修正逻辑——的最佳时刻。",
  "React & TypeScript Rocks!",
  "1234567890",
  "换行测试\n换行测试\n换行测试",
];

const generateRandomData = (count: number, startIndex: number = 0) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const globalIdx = startIndex + i;
    const textCount = Math.floor(Math.random() * 3) + 1;
    let content = "";
    for (let j = 0; j < textCount; j++) {
      content +=
        RANDOM_TEXTS[Math.floor(Math.random() * RANDOM_TEXTS.length)] + " ";
    }
    data.push({
      id: globalIdx,
      content: `[ID: ${globalIdx}] ${content}`,
    });
  }
  return data;
};

const App = () => {
  const listData = useMemo(() => generateRandomData(100000), []);
  const [incrementalData] = useState(() => generateRandomData(100000));
  const incrementalRef = useRef<IncrementalListRef>(null);

  // 跳转相关状态
  const [jumpIndex, setJumpIndex] = useState(1000);
  const [jumpAlign, setJumpAlign] = useState<"start" | "center" | "end">(
    "center",
  );

  const handleJump = () => {
    incrementalRef.current?.scrollToIndex(jumpIndex, jumpAlign);
  };

  return (
    <div className="app-container">
      <div className="header-section">
        <h1>虚拟列表演进</h1>
        <p>
          并列对比 10万 条数据的渲染性能。通过控制 DOM 数量和位置计算算法，
          实现超大规模列表的丝滑滚动。
        </p>
      </div>

      <div className="list-comparison-grid">
        {/* 1. 固定高度方案 */}
        <div className="card fixed">
          <div className="card-title">
            <h3>固定高度</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">O(1) 数学定位</div>
              <div className="analysis-content">
                <span className="analysis-label negative">缺点:</span>
                高度定死，内容无法撑开，缺乏业务适用性。而且拖动滚动条会白屏
              </div>
            </div>
            {/* 仅留白以保持高度对齐 */}
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <VirtualList
              listData={listData}
              itemHeight={80}
              containerHight={650}
              bufferCount={10}
            />
          </div>
        </div>

        {/* 2. 普通动态高度方案 */}
        <div className="card dynamic">
          <div className="card-title">
            <h3>普通动态高度</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">测量 + O(n) 修正</div>
              <div className="analysis-content">
                <span className="analysis-label negative">缺点:</span>
                快速拖拽白屏。$O(n)$
                全量修正难以扩展至百万级数据。拖动滚动条白屏,滚动条不跟手
              </div>
            </div>
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <DynamicVirtualList
              listData={listData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
            />
          </div>
        </div>

        {/* 3. 分片动态高度方案 */}
        <div className="card segmented">
          <div className="card-title">
            <h3>分片动态高度+自定义进度条</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">分片 O(logN) + 状态同步</div>
              <div className="analysis-content">
                <span className="analysis-label positive">核心:</span>
                采用分片维护局部高度，大幅降低重算开销。引入自定义滚动条。
              </div>
            </div>
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <SegmentedVirtualList
              listData={listData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
        </div>

        {/* 4. 精准定位实验室 (NEW) */}
        <div className="card incremental">
          <div className="card-title">
            <h3>精准定位实验室</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">scrollToIndex + 智能对齐</div>
              <div className="analysis-content">
                <span className="analysis-label positive">特性:</span>
                支持输入任意行号进行<b>瞬时跳转</b>
                。即使目标项从未被渲染，也能通过预估高度实现物理定位。
              </div>
            </div>

            <div
              className="control-panel"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "auto",
                flexWrap: "nowrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="number"
                  value={jumpIndex}
                  onChange={(e) => setJumpIndex(Number(e.target.value))}
                  placeholder="索引"
                  style={{
                    width: "70px",
                    padding: "6px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
                <button
                  onClick={handleJump}
                  className="btn-jump"
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    background: "#4A90E2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "13px",
                  }}
                >
                  跳转
                </button>
              </div>

              <div
                className="align-selector"
                style={{
                  display: "flex",
                  background: "#f0f0f0",
                  padding: "2px",
                  borderRadius: "6px",
                  marginLeft: "auto",
                }}
              >
                {(["start", "center", "end"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setJumpAlign(mode)}
                    style={{
                      padding: "4px 8px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      background: jumpAlign === mode ? "#fff" : "transparent",
                      boxShadow:
                        jumpAlign === mode
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                      color: jumpAlign === mode ? "#4A90E2" : "#666",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mode === "start" ? "顶" : mode === "center" ? "中" : "底"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="list-viewport">
            <IncrementalVirtualList
              ref={incrementalRef}
              listData={incrementalData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
