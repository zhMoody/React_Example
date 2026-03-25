import { useState } from "react";
import { useWatermark } from "../../context/WatermarkContext";
import { InvisibleWaterMark } from "./InvisibleWaterMark";
import Button, { ButtonVariant } from "../../components/common/Button";
import "./WaterMark.css";

export const WaterMark = () => {
  const [tab, setTab] = useState<"visible" | "invisible">("visible");
  const { isEnabled, showWatermark, hideWatermark, updateConfig, config } =
    useWatermark();

  const modes: any[] = [
    { label: "Background 模式 (Base64)", value: "background" },
    { label: "SVG 模式 (矢量)", value: "svg" },
    { label: "Canvas 模式 (直接渲染)", value: "canvas" },
  ];

  return (
    <div className="watermark-page">
      <div className="tab-header">
        <Button
          variant={
            tab === "visible" ? ButtonVariant.Primary : ButtonVariant.Ghost
          }
          onClick={() => setTab("visible")}
        >
          全局明水印
        </Button>
        <Button
          variant={
            tab === "invisible" ? ButtonVariant.Primary : ButtonVariant.Ghost
          }
          onClick={() => setTab("invisible")}
        >
          暗水印 (Worker 实验)
        </Button>
      </div>

      <div className="tab-content">
        {tab === "visible" ? (
          <div className="card" style={{ padding: "40px" }}>
            <h3>全局水印控制面板</h3>
            <p>
              当前状态: <strong>{isEnabled ? "已开启" : "已关闭"}</strong> |
              模式: <strong>{config.mode}</strong>
            </p>

            <div
              className="mode-selector"
              style={{ margin: "20px 0", display: "flex", gap: "10px" }}
            >
              {modes.map((m) => (
                <Button
                  key={m.value}
                  variant={
                    config.mode === m.value
                      ? ButtonVariant.Primary
                      : ButtonVariant.Ghost
                  }
                  onClick={() => updateConfig({ mode: m.value })}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            <div className="controls-stack">
              <Button
                onClick={() => showWatermark({ text: "张三 (UserID: 9527)" })}
              >
                开启全局水印
              </Button>
              <Button variant={ButtonVariant.Danger} onClick={hideWatermark}>
                关闭水印
              </Button>
            </div>

            <div
              style={{
                marginTop: "24px",
                borderTop: "1px solid #eee",
                paddingTop: "20px",
              }}
            >
              <h4>对比说明：</h4>
              <ul style={{ fontSize: "14px", color: "#666", lineHeight: "2" }}>
                <li>
                  <strong>Background:</strong> 最通用。生成一次 Base64
                  图片后，由浏览器负责平铺，性能极佳。
                </li>
                <li>
                  <strong>SVG:</strong> 文本边缘最清晰。支持 CSS
                  样式注入，且代码可读性好。
                </li>
                <li>
                  <strong>Canvas:</strong> 直接在页面覆盖一个巨大
                  Canvas。适合需要动态实时交互的水印。
                </li>
              </ul>
            </div>

            <div
              className="danger-zone"
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#fff2f0",
                border: "1px solid #ffccc7",
              }}
            >
              <strong>防删除实验：</strong> 开启水印后，请在 F12 尝试删除{" "}
              <code>body</code> 下的水印节点或修改其样式，它会瞬间自动恢复。
            </div>

            <div
              className="tech-specs"
              style={{
                marginTop: "30px",
                padding: "20px",
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", color: "#389e0d" }}>
                🛡️ 如何实现“不可删除”？
              </h4>
              <ul
                style={{
                  fontSize: "13px",
                  color: "#333",
                  lineHeight: "1.8",
                  paddingLeft: "20px",
                }}
              >
                <li>
                  <strong>MutationObserver 核心监听：</strong> 利用浏览器原生
                  API 实时监听 DOM 树的变化。不仅监听水印节点本身，还监听了{" "}
                  <code>document.body</code> 的所有子节点变动。
                </li>
                <li>
                  <strong>全方位覆盖：</strong> 配置{" "}
                  <code>childList: true</code>
                  （监听增删）、<code>attributes: true</code>
                  （监听样式/类名修改）以及 <code>subtree: true</code>
                  （监听深层嵌套节点，防止通过删除父级绕过）。
                </li>
                <li>
                  <strong>自动补偿机制：</strong> 一旦检测到水印节点从 DOM
                  树中消失，监听回调会立即触发 <code>createWatermark()</code>{" "}
                  函数，在毫秒级时间内于 <code>body.firstChild</code>{" "}
                  位置原地复活。
                </li>
                <li>
                  <strong>样式锁定：</strong> 如果用户在控制台尝试修改{" "}
                  <code>opacity: 0</code>、<code>display: none</code> 或{" "}
                  <code>z-index</code>
                  ，系统会识别到属性变化并强制刷回初始安全样式。
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="card">
            <InvisibleWaterMark />
          </div>
        )}
      </div>
    </div>
  );
};
