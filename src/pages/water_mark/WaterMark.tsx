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
  const [showDetails, setShowDetails] = useState(false);
  const { showWatermark, hideWatermark, updateConfig, config } = useWatermark();

  const modes: { label: string; value: "background" | "svg" | "canvas" }[] = [
    { label: "Background", value: "background" },
    { label: "SVG", value: "svg" },
    { label: "Canvas", value: "canvas" },
  ];

  const handleConfigChange = (key: string, value: string | number) => {
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

      <div className="tab-content" key={tab}>
        {tab === "visible" ? (
          <div className="card" style={{ padding: "32px" }}>
            <div className="watermark-settings">
              <h3>🎨 全局参数配置</h3>

              <div className="settings-grid">
                <div className="setting-item">
                  <label>
                    内容 <span>{config.text}</span>
                  </label>
                  <input
                    type="text"
                    value={config.text}
                    onChange={(e) => handleConfigChange("text", e.target.value)}
                    placeholder="输入水印文字..."
                  />
                </div>
                <div className="setting-item">
                  <label>
                    颜色 <span>{config.color}</span>
                  </label>
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) =>
                      handleConfigChange("color", e.target.value)
                    }
                  />
                </div>
                <div className="setting-item">
                  <label>
                    字体大小 <span>{config.fontSize}px</span>
                  </label>
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
                  <label>
                    透明度 <span>{config.opacity}</span>
                  </label>
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
                  <label>
                    间距 <span>{config.gap}px</span>
                  </label>
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
                  <label>
                    旋转角度 <span>{config.angle}°</span>
                  </label>
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

              <div className="mode-selector">
                <label>渲染模式：</label>
                <div style={{ display: "flex", gap: "8px" }}>
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
              </div>

              <div className="controls-stack">
                <Button onClick={() => showWatermark()} size={ButtonSize.LG}>
                  开启全局生效
                </Button>
                <Button
                  variant={ButtonVariant.Danger}
                  onClick={hideWatermark}
                  size={ButtonSize.LG}
                >
                  关闭全局水印
                </Button>
              </div>
            </div>

            <div
              style={{
                marginTop: "40px",
                borderTop: "1px solid var(--border-color)",
                paddingTop: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h4 style={{ margin: 0 }}>📌 技术实现原理说明</h4>
                <Button
                  variant={ButtonVariant.Link}
                  size={ButtonSize.SM}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "收起详情 ↑" : "查看详情 ↓"}
                </Button>
              </div>

              {showDetails && (
                <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                  <div className="status-box info" style={{ marginBottom: "20px" }}>
                    <ul className="tech-list">
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

                  <div className="status-box danger" style={{ marginBottom: "20px" }}>
                    <strong>🛡️ 防删除检测：</strong> 开启水印后，请在 F12 尝试删除{" "}
                    <code>body</code> 下的水印节点或修改其样式，它会瞬间自动恢复。
                  </div>

                  <div className="status-box success">
                    <h5 style={{ margin: "0 0 10px 0" }}>🔎 如何实现“不可删除”？</h5>
                    <ul className="tech-list">
                      <li>
                        <strong>MutationObserver 核心监听：</strong> 利用浏览器原生
                        API 实时监听 DOM 树的变化。
                      </li>
                      <li>
                        <strong>全方位覆盖：</strong> 配置{" "}
                        <code>childList</code>、<code>attributes</code> 及 <code>subtree</code>。
                      </li>
                      <li>
                        <strong>自动补偿机制：</strong>{" "}
                        一旦检测到水印节点消失，立即在 <code>body.firstChild</code> 位置复活。
                      </li>
                      <li>
                        <strong>样式锁定：</strong> 任何 <code>opacity</code> 或{" "}
                        <code>display</code> 的恶意修改都会被强制回滚。
                      </li>
                    </ul>
                  </div>
                </div>
              )}
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
