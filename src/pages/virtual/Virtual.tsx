import { useRef, useState } from "react";
import DynamicVirtualList from "../../components/virtual/DynamicVirtualList";
import {
  EditableVirtualList,
  EditableListRef,
} from "../../components/virtual/EditableVirtualList";
import {
  IncrementalVirtualList,
  IncrementalListRef,
} from "../../components/virtual/IncrementalVirtualList";
import { SegmentedVirtualList } from "../../components/virtual/SegmentedVirtualList";
import { VirtualList } from "../../components/virtual/VirtualList";
import { JumpAlign } from "../../types/Enum";
import Button, {
  ButtonSize,
  ButtonVariant,
} from "../../components/common/Button";

const RANDOM_TEXTS = [
  "短小精悍。",
  "这是一段中等长度的描述文字，用于测试列表的撑开效果。",
  "【超长警告】这是一段非常非常非常长长长长长长长长长长长长长长长长长长长长长长长长长长长长的文字。它必然会触发换行，从而产生一个巨大的物理高度。这正是考验动态高度虚拟列表核心算法——位置修正逻辑——的最佳时刻。",
  "React & TypeScript Rocks!",
  "1234567890",
  "换行测试\n换行测试\n换行测试",
];

const generateRandomData = (count: number) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const textCount = Math.floor(Math.random() * 3) + 1;
    let content = "";
    for (let j = 0; j < textCount; j++) {
      content +=
        RANDOM_TEXTS[Math.floor(Math.random() * RANDOM_TEXTS.length)] + " ";
    }
    data.push({
      id: i, // 稳定 ID 极其重要，它是虚拟列表复用 DOM 的唯一凭证
      content: `[ID: ${i}] ${content.trim()}`,
    });
  }
  return data;
};

// 【性能优化点 2】
// 全局单例数据源。所有的实验室卡片都共享这 10 万个对象的内存引用。
const GLOBAL_DATA_SOURCE = generateRandomData(100000);

const Virtual = () => {
  // 引用共享数据源
  const sharedListData = GLOBAL_DATA_SOURCE;

  // 获取子组件的命令式接口（Ref）
  const incrementalRef = useRef<IncrementalListRef>(null);
  const editableRef = useRef<EditableListRef>(null);

  /**
   * 【状态管理】
   * 这里的状态主要用于控制跳转。
   * 注意：使用了 React 的受控组件逻辑，输入数字时 Virtual 会重绘，
   * 得益于上方的全局数据源，这种重绘是极其轻量的。
   */
  const [jumpIndex, setJumpIndex] = useState(1000); // 列表 4 的跳转索引
  const [jumpAlign, setJumpAlign] = useState<JumpAlign>(JumpAlign.CENTER); // 列表 4 的对齐方式

  const [editJumpIndex, setEditJumpIndex] = useState(100); // 列表 5 的跳转索引

  return (
    <div className="app-container">
      <div className="header-section">
        <h1>虚拟列表演进实验室</h1>
        <p>
          并列对比 100,000 条数据的渲染性能。探索从 O(1) 数学定位到全功能 CRUD
          的技术演进。
        </p>
      </div>

      <div className="list-comparison-grid">
        <div className="card fixed">
          <div className="card-title">
            <h3>固定高度</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">O(1) 数学定位</div>
              <div className="analysis-content">
                <span className="analysis-label negative">缺点:</span>
                高度定死，无法承开高度。但性能最高，计算最简单。
              </div>
            </div>
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <VirtualList
              listData={sharedListData}
              itemHeight={80}
              containerHight={650}
              bufferCount={10}
            />
          </div>
        </div>

        <div className="card dynamic">
          <div className="card-title">
            <h3>普通动态高度</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">测量 + O(n) 修正</div>
              <div className="analysis-content">
                <span className="analysis-label negative">缺点:</span>
                原生滚动异步性导致快速滑动白屏。并且进度条不跟手,
                修正算法难以支撑百万级。
              </div>
            </div>
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <DynamicVirtualList
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
            />
          </div>
        </div>

        <div className="card segmented">
          <div className="card-title">
            <h3>分片动态高度</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">分片 O(logN) + 状态同步</div>
              <div className="analysis-content">
                <span className="analysis-label positive">核心:</span>
                自定义滚动条解决了白屏问题。分片地图大幅提升了长列表更新性能。
              </div>
            </div>
            <div style={{ height: "38px", marginTop: "auto" }}></div>
          </div>
          <div className="list-viewport">
            <SegmentedVirtualList
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
        </div>

        <div className="card incremental">
          <div className="card-title">
            <h3>精准定位</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">scrollToIndex + 智能对齐</div>
              <div className="analysis-content">
                <span className="analysis-label positive">特性:</span>
                支持顶部/居中/底部跳转。具备基于预估高度的初定位和测量后的二次校准。
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
                  style={{
                    width: "70px",
                    padding: "6px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
                <Button
                  onClick={() =>
                    incrementalRef.current?.scrollToIndex(jumpIndex, jumpAlign)
                  }
                  size={ButtonSize.SM}
                >
                  跳转
                </Button>
              </div>
              <div
                className="align-selector"
                style={{
                  display: "flex",
                  background: "var(--bg-layout)",
                  padding: "2px",
                  borderRadius: "6px",
                  marginLeft: "auto",
                }}
              >
                {[JumpAlign.START, JumpAlign.CENTER, JumpAlign.END].map(
                  (mode) => (
                    <Button
                      key={mode}
                      onClick={() => setJumpAlign(mode)}
                      size={ButtonSize.SM}
                      variant={
                        jumpAlign === mode
                          ? ButtonVariant.Secondory
                          : ButtonVariant.Ghost
                      }
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        minWidth: "32px",
                        borderRadius: "4px",
                      }}
                    >
                      {mode === JumpAlign.START
                        ? "顶"
                        : mode === JumpAlign.CENTER
                          ? "中"
                          : "底"}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="list-viewport">
            <IncrementalVirtualList
              ref={incrementalRef}
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={650}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
        </div>

        <div className="card editable">
          <div className="card-title">
            <h3>CRUD 动态分片高度虚拟列表</h3>
            <div className="analysis-box">
              <div className="analysis-tag info">编辑 + 增删 + 定位</div>
              <div className="analysis-content">
                <span className="analysis-label positive">核心:</span>
                每一个 Item 都是独立的动态高度编辑器。支持 ID
                级高度记忆和随动推移算法。
              </div>
            </div>
            <div
              className="control-panel"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "auto",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="number"
                  value={editJumpIndex}
                  onChange={(e) => setEditJumpIndex(Number(e.target.value))}
                  style={{
                    width: "70px",
                    padding: "6px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
                <Button
                  onClick={() =>
                    editableRef.current?.scrollToIndex(
                      editJumpIndex,
                      JumpAlign.START,
                    )
                  }
                  size={ButtonSize.SM}
                >
                  跳转
                </Button>
              </div>
            </div>
          </div>
          <div className="list-viewport">
            <EditableVirtualList
              ref={editableRef}
              initialData={sharedListData}
              containerHeight={650}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Virtual;
