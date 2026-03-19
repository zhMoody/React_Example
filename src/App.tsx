import "./index.css";
import "./App.css";
import VirtualList from "./Components/VirtualList";
import DynamicVirtualList from "./Components/DynamicVirtualList";
import SegmentedVirtualList from "./Components/SegmentedVirtualList";
import { useMemo } from "react";

const RANDOM_TEXTS = [
  "短小精悍。",
  "这是一段中等长度的描述文字，用于测试列表的撑开效果。",
  "【超长警告】这是一段非常非常非常长长长长长长长长长长长长长长长长长长长长长长长长长长长长的文字。它必然会触发换行，从而产生一个巨大的物理高度。这正是考验动态高度虚拟列表核心算法——位置修正逻辑——的最佳时刻。",
  "React & TypeScript Rocks!",
  "1234567890",
  "换行测试\n换行测试\n换行测试",
];

const App = () => {
  const listData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 100000; i++) {
      const count = Math.floor(Math.random() * 3) + 1;
      let content = "";
      for (let j = 0; j < count; j++) {
        content +=
          RANDOM_TEXTS[Math.floor(Math.random() * RANDOM_TEXTS.length)] + " ";
      }
      data.push({
        id: i,
        text: `[ID: ${i}] ${content}`,
        content: `[ID: ${i}] ${content}`,
      });
    }
    return data;
  }, []);

  return (
    <div className="app-container">
      <div className="header-section">
        <h1>虚拟列表演进实验室</h1>
        <p>
          并列对比 100,000 条数据的渲染性能。通过控制 DOM 数量和位置计算算法，
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
                高度定死，内容无法撑开，缺乏业务适用性。原生滚动异步性导致快速滑动时出现白屏。
              </div>
            </div>
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
                快速拖动白屏且滚动条不跟手。$O(n)$ 全量位置修正虽在 JS
                内存中运行较快，但在底层架构上难以扩展至百万级数据。
              </div>
            </div>
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
                采用分片维护局部高度，大幅降低重算开销。引入<b>自定义滚动条</b>
                将物理滚动转为逻辑状态切换，从根本上消除了拖拽白屏。
              </div>
            </div>
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
      </div>
    </div>
  );
};

export default App;
