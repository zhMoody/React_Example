import { useRef, useState, useMemo } from "react";
import DynamicVirtualList from "../../components/virtual/DynamicVirtualList";
import {
  EditableListRef,
  EditableVirtualList,
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
import "./Virtual.css";

const RANDOM_TEXTS = [
  "量子计算模拟序列已就绪。",
  "神经网络权重参数更新完成。系统检测到 0x4F 扇区存在轻微的电压波动，建议在下一个渲染周期进行全量校验。当前并发线程数：1024，缓存命中率：98.5%。",
  "【超长实验日志】开始执行深度内存扫描... 正在检索从 0x0000 到 0xFFFF 的所有有效地址空间。检测到大量碎片化数据流。系统尝试进行自动碎片整理，但由于 IO 等待时间过长，该操作已被推迟。请注意，在虚拟列表环境下，这种超长文本会导致 DOM 节点产生巨大的物理高度差，这正是考验 Segmented 分片算法中‘索引地图’动态更新精度和‘位置修正’算法鲁棒性的最佳时刻。",
  "数据封包 [ID: 0x4F] 已接收并校验。",
  "警告：扇区 7 内存占用超出阈值。当前堆栈深度：42。正在执行紧急内存回收协议...",
  "正在同步远程实验室节点数据流。节点 A: 在线, 节点 B: 延迟 24ms, 节点 C: 正在重新连接。当前全局状态一致性校验通过。",
  "底层驱动程序重载成功。内核版本：v4.2.0-实验室稳定版。",
  "检测到不稳定的渲染时序周期。正在尝试通过 requestAnimationFrame 进行时钟对齐。偏差值：0.0034ms。",
];

const generateRandomData = (count: number) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const isLongText = Math.random() > 0.8;
    const textCount = isLongText ? 5 : 1;
    let content = "";
    for (let j = 0; j < textCount; j++) {
      content +=
        RANDOM_TEXTS[Math.floor(Math.random() * RANDOM_TEXTS.length)] + "\n";
    }
    data.push({
      id: i,
      content: content.trim(),
    });
  }
  return data;
};

const GLOBAL_DATA_SOURCE = generateRandomData(100000);

export const Virtual = () => {
  const sharedListData = GLOBAL_DATA_SOURCE;
  const incrementalRef = useRef<IncrementalListRef>(null);
  const editableRef = useRef<EditableListRef>(null);

  const [jumpIndex, setJumpIndex] = useState(1000);
  const [jumpAlign, setJumpAlign] = useState<JumpAlign>(JumpAlign.CENTER);
  const [editJumpIndex, setEditJumpIndex] = useState(100);

  const currentTime = useMemo(() => new Date().toLocaleTimeString(), []);

  return (
    <div className="virtual-lab">
      <header className="lab-header">
        <div className="lab-title-group">
          <h1>虚拟列表演进实验室.sys</h1>
          <p>对比 100,000 条核心数据的渲染策略与性能演进路径</p>
        </div>
        <div className="lab-status">
          <span className="status-dot"></span>
          实验室系统在线 // {currentTime}
        </div>
      </header>

      <div className="lab-grid">
        {/* 模块 01: 固定高度 */}
        <section className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_01</span>
              <span className="module-complexity">算法复杂度: O(1) 定位</span>
            </div>
            <div className="module-title">
              <h3>固定高度静态布局</h3>
              <p className="module-desc">
                最基础的数学分段渲染，拥有极致的 CPU 执行效率。
              </p>
            </div>
            <div className="module-analysis">
              <div>
                <span className="analysis-label label-pos">优势:</span>
                零测量开销，滚动极其稳定。
              </div>
              <div>
                <span className="analysis-label label-neg">缺点:</span>
                无法适配不规则内容，布局灵活性差。
              </div>
            </div>
          </div>
          <div className="module-viewport">
            <VirtualList
              listData={sharedListData}
              itemHeight={80}
              containerHight={500}
              bufferCount={10}
            />
          </div>
        </section>

        {/* 模块 02: 动态高度 */}
        <section className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_02</span>
              <span className="module-complexity">
                算法复杂度: O(N) 位置修正
              </span>
            </div>
            <div className="module-title">
              <h3>动态高度自适应</h3>
              <p className="module-desc">
                支持实时内容撑开，引入物理高度测量与地图修正算法。
              </p>
            </div>
            <div className="module-analysis">
              <div>
                <span className="analysis-label label-pos">优势:</span>
                完美支持复杂富文本与非固定比例卡片。
              </div>
              <div>
                <span className="analysis-label label-neg">缺点:</span>
                大数据量下 O(N) 修正可能导致主线程阻塞。
              </div>
            </div>
          </div>
          <div className="module-viewport">
            <DynamicVirtualList
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={500}
              bufferCount={10}
            />
          </div>
        </section>

        {/* 模块 03: 分片 */}
        <section className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_03</span>
              <span className="module-complexity">
                数据架构: O(logN) 分片地图
              </span>
            </div>
            <div className="module-title">
              <h3>数据分片渲染策略</h3>
              <p className="module-desc">
                通过数据 Sharding 降低全量更新频率，自定义滚动条状态同步。
              </p>
            </div>
            <div className="module-analysis">
              <div>
                <span className="analysis-label label-pos">核心:</span>
                有效缓解快速滚动时的白屏现象。
              </div>
            </div>
          </div>
          <div className="module-viewport">
            <SegmentedVirtualList
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={500}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
        </section>

        {/* 模块 04: 精准跳转 */}
        <section className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_04</span>
              <span className="module-complexity">寻址精度: 像素级校准</span>
            </div>
            <div className="module-title">
              <h3>精准定位控制器</h3>
              <p className="module-desc">
                集成智能跳转算法，支持多种对齐策略与测量后的二次校准。
              </p>
            </div>
          </div>
          <div className="module-viewport">
            <IncrementalVirtualList
              ref={incrementalRef}
              listData={sharedListData}
              estimatedItemHeight={80}
              containerHeight={450}
              bufferCount={10}
              segmentSize={1000}
            />
          </div>
          <div className="module-controls">
            <input
              type="number"
              className="lab-input"
              value={jumpIndex}
              onChange={(e) => setJumpIndex(Number(e.target.value))}
            />
            <Button
              onClick={() =>
                incrementalRef.current?.scrollToIndex(jumpIndex, jumpAlign)
              }
              size={ButtonSize.SM}
              variant={ButtonVariant.Primary}
            >
              执行寻址定位
            </Button>
            <div className="align-group">
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
                    style={{ minWidth: "40px", fontSize: "10px" }}
                  >
                    {mode === JumpAlign.START
                      ? "顶端"
                      : mode === JumpAlign.CENTER
                        ? "居中"
                        : "末端"}
                  </Button>
                ),
              )}
            </div>
          </div>
        </section>

        {/* 模块 05: 全功能 CRUD */}
        <section className="lab-module" style={{ gridColumn: "1 / -1" }}>
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_05</span>
              <span className="module-complexity">
                交互功能: 全量 CRUD 实验室
              </span>
            </div>
            <div className="module-title">
              <h3>全功能编辑器工作台</h3>
              <p className="module-desc">
                在虚拟化环境中处理实时数据变更。支持 ID
                级高度记忆、增删随动与动态对齐。测试大规模数据的编辑响应能力。
              </p>
            </div>
          </div>
          <div className="module-viewport">
            <EditableVirtualList
              ref={editableRef}
              initialData={sharedListData}
              containerHeight={450}
            />
          </div>
          <div className="module-controls">
            <span className="module-complexity">跳转索引寻址:</span>
            <input
              type="number"
              className="lab-input"
              value={editJumpIndex}
              onChange={(e) => setEditJumpIndex(Number(e.target.value))}
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
              执行寻址跳转
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
