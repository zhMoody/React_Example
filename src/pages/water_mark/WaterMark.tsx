import { useState } from "react";
import { useWatermark } from "../../context/WatermarkContext";
import { InvisibleWaterMark } from "./InvisibleWaterMark";
import Button, {
  ButtonSize,
  ButtonVariant,
} from "../../components/common/Button";
import "./WaterMark.css";

export const WaterMark = () => {
  const [tab, setTab] = useState<"visible" | "invisible">("visible");
  const { showWatermark, hideWatermark, updateConfig, config } = useWatermark();

  const modes: any[] = [
    { label: "Background", value: "background" },
    { label: "SVG", value: "svg" },
    { label: "Canvas", value: "canvas" },
  ];

  const handleConfigChange = (key: string, value: any) => {
    updateConfig({ [key]: value });
  };

  return (
    <div className="watermark-page">
      <div className="tab-header">
        <Button
          variant={
            tab === "visible" ? ButtonVariant.Primary : ButtonVariant.Ghost
          }
          onClick={() => setTab("visible")}
        >
          全局明水印 (可视化配置)
        </Button>
        <Button
          variant={
            tab === "invisible" ? ButtonVariant.Primary : ButtonVariant.Ghost
          }
          onClick={() => setTab("invisible")}
        >
          暗水印 (显影实验室)
        </Button>
      </div>

      <div className="tab-content">
        {tab === "visible" ? (
          <div className="card" style={{ padding: "30px" }}>
            <div className="watermark-settings">
              <h3>🎨 全局参数配置</h3>

              <div className="settings-grid">
                <div className="setting-item">
                  <label>内容：</label>
                  <input
                    type="text"
                    value={config.text}
                    onChange={(e) => handleConfigChange("text", e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>颜色：</label>
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) =>
                      handleConfigChange("color", e.target.value)
                    }
                  />
                </div>
                <div className="setting-item">
                  <label>字体大小 ({config.fontSize}px)：</label>
                  <input
                    type="range"
                    min="12"
                    max="64"
                    value={config.fontSize}
                    onChange={(e) =>
                      handleConfigChange("fontSize", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="setting-item">
                  <label>透明度 ({config.opacity})：</label>
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.05"
                    value={config.opacity}
                    onChange={(e) =>
                      handleConfigChange("opacity", parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="setting-item">
                  <label>间距 ({config.gap}px)：</label>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={config.gap}
                    onChange={(e) =>
                      handleConfigChange("gap", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="setting-item">
                  <label>旋转角度 ({config.angle}°)：</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={config.angle}
                    onChange={(e) =>
                      handleConfigChange("angle", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="mode-selector" style={{ marginTop: "20px" }}>
                <label>渲染模式：</label>
                {modes.map((m) => (
                  <Button
                    key={m.value}
                    variant={
                      config.mode === m.value
                        ? ButtonVariant.Primary
                        : ButtonVariant.Ghost
                    }
                    size={ButtonSize.SM}
                    onClick={() => updateConfig({ mode: m.value })}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>

              <div className="controls-stack" style={{ marginTop: "30px" }}>
                <Button onClick={() => showWatermark()}>开启全局生效</Button>
                <Button variant={ButtonVariant.Danger} onClick={hideWatermark}>
                  关闭全局水印
                </Button>
              </div>
            </div>

            <div
              style={{
                marginTop: "30px",
                borderTop: "1px solid var(--border-color)",
                paddingTop: "20px",
              }}
            >
              <h4>📌 渲染模式对比说明：</h4>
              <ul
                style={{
                  fontSize: "14px",
                  color: "var(--text-subtle)",
                  lineHeight: "2",
                }}
              >
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
              <strong>🛡️ 防删除检测：</strong> 开启水印后，请在 F12 尝试删除{" "}
              <code>body</code> 下的水印节点或修改其样式，它会瞬间自动恢复。
            </div>

            <div
              className="tech-specs"
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", color: "#389e0d" }}>
                🔎 如何实现“不可删除”？
              </h4>
              <ul
                style={{
                  fontSize: "13px",
                  color: "var(--text-main)",
                  lineHeight: "1.8",
                  paddingLeft: "20px",
                }}
              >
                <li>
                  <strong>MutationObserver 核心监听：</strong> 利用浏览器原生
                  API 实时监听 DOM 树的变化。监听了 <code>document.body</code>{" "}
                  的所有子节点变动。
                </li>
                <li>
                  <strong>全方位覆盖：</strong> 配置{" "}
                  <code>childList: true</code>
                  （监听增删）、<code>attributes: true</code>
                  （监听样式/类名修改）以及 <code>subtree: true</code>
                  （监听深层嵌套节点，防止通过删除父级绕过）。
                </li>
                <li>
                  <strong>自动补偿机制：</strong>{" "}
                  一旦检测到水印节点消失，监听回调会立即触发{" "}
                  <code>createWatermark()</code>，在毫秒级时间内于{" "}
                  <code>body.firstChild</code> 位置复活。
                </li>
                <li>
                  <strong>样式锁定：</strong> 如果修改 <code>opacity</code> 或{" "}
                  <code>display</code>，系统会识别到属性变化并强制刷回初始样式。
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
