import React from "react";
import { ThemeMode } from "../../types/Enum";
import {
  useTheme,
  CustomThemeConfig,
  LIGHT_DEFAULTS,
  DARK_DEFAULTS,
  THEME_METADATA,
} from "../../context/ThemeContext";
import "./ThemeChange.css";
import Button, {
  ButtonSize,
  ButtonVariant,
} from "../../components/common/Button";

const ThemeChange: React.FC = () => {
  const {
    theme,
    setTheme,
    resolvedTheme,
    customConfig,
    setCustomConfig,
    lastBasePreset,
    setLastBasePreset,
  } = useTheme();

  const isCustomMode = theme === ThemeMode.CUSTOM;

  const currentDisplayConfig = isCustomMode
    ? customConfig
    : resolvedTheme === "dark"
      ? DARK_DEFAULTS
      : LIGHT_DEFAULTS;

  const handleColorChange = (key: keyof CustomThemeConfig, value: string) => {
    if (!isCustomMode) return;
    setCustomConfig({ ...customConfig, [key]: value });
  };

  const applyDefaults = (mode: "light" | "dark") => {
    const defaults = mode === "light" ? LIGHT_DEFAULTS : DARK_DEFAULTS;
    setCustomConfig({ ...defaults });
    setLastBasePreset(mode);
    setTheme(ThemeMode.CUSTOM);
  };

  const resetSingleColor = (key: keyof CustomThemeConfig) => {
    if (!isCustomMode) return;
    const baseSource =
      lastBasePreset === "dark" ? DARK_DEFAULTS : LIGHT_DEFAULTS;
    setCustomConfig({ ...customConfig, [key]: baseSource[key] });
  };

  const getSelector = () => {
    if (theme === ThemeMode.CUSTOM) return ":root /* Custom */";
    if (resolvedTheme === "dark") return "[data-theme='dark']";
    return ":root";
  };

  return (
    <div className="theme-lab-page">
      <header className="theme-lab-header">
        <h1>主题实验室</h1>
        <p>自定义、实时预览、全量导出, 语义化css变量。</p>
      </header>

      <section className="sticky-mode-switcher">
        <div className="theme-switcher">
          {[
            { mode: ThemeMode.SYSTEM, icon: "🖥️", label: "系统" },
            { mode: ThemeMode.LIGHT, icon: "☀️", label: "明亮" },
            { mode: ThemeMode.DARK, icon: "🌙", label: "深邃" },
            { mode: ThemeMode.CUSTOM, icon: "🎨", label: "自定义" },
          ].map((item) => (
            <Button
              key={item.mode}
              variant={
                theme === item.mode
                  ? ButtonVariant.Secondory
                  : ButtonVariant.Ghost
              }
              className={`theme-btn ${theme === item.mode ? "active" : ""}`}
              onClick={() => setTheme(item.mode)}
              style={{ border: "none", boxShadow: "none" }}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </Button>
          ))}
        </div>
      </section>

      <div className="lab-content-grid">
        <div className="lab-editor-pane">
          <div className="dashboard-card">
            <div className="card-header">
              <h3 style={{ margin: 0 }}>色彩管理</h3>
              <div
                className="action-group"
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div className="base-preset-hint">
                  复位基准:{" "}
                  <span className={`preset-tag ${lastBasePreset}`}>
                    {lastBasePreset === "dark" ? "深邃" : "明亮"}
                  </span>
                </div>
                <Button
                  variant={ButtonVariant.Secondory}
                  size={ButtonSize.SM}
                  onClick={() => applyDefaults("light")}
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  导入明亮预设
                </Button>
                <Button
                  variant={ButtonVariant.Secondory}
                  size={ButtonSize.SM}
                  onClick={() => applyDefaults("dark")}
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  导入深邃预设
                </Button>
              </div>
            </div>

            {!isCustomMode && (
              <div className="custom-hint">
                💡 当前为预设模式，颜色不可修改。点击 <strong>自定义</strong>{" "}
                模式开启编辑。
              </div>
            )}

            <div className="color-picker-grid">
              {Object.entries(currentDisplayConfig).map(([key, value]) => {
                const k = key as keyof CustomThemeConfig;
                return (
                  <div
                    className={`picker-item ${!isCustomMode ? "disabled" : ""}`}
                    key={k}
                  >
                    <div className="picker-label-row">
                      <div className="label-main">
                        <span className="var-name">{k}</span>
                        <span className="var-desc">{THEME_METADATA[k]}</span>
                      </div>
                      {isCustomMode && (
                        <Button
                          variant={ButtonVariant.Ghost}
                          size={ButtonSize.SM}
                          className="item-reset-btn"
                          onClick={() => resetSingleColor(k)}
                          title={`恢复到最后导入的${lastBasePreset === "dark" ? "深邃" : "明亮"}预设`}
                          style={{
                            width: "24px",
                            height: "24px",
                            padding: 0,
                            minWidth: "24px",
                          }}
                        >
                          ↺
                        </Button>
                      )}
                    </div>
                    <div className="picker-control">
                      <input
                        type="color"
                        value={value}
                        disabled={!isCustomMode}
                        onChange={(e) => handleColorChange(k, e.target.value)}
                      />
                      <input
                        type="text"
                        value={value}
                        disabled={!isCustomMode}
                        onChange={(e) => handleColorChange(k, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lab-preview-pane">
          <div className="sticky-preview-container">
            <div className="dashboard-card code-section">
              <div className="card-header">
                <h3>导出配置</h3>
                <Button
                  size={ButtonSize.SM}
                  onClick={() => {
                    const cssText = `${getSelector()} {\n${Object.entries(
                      currentDisplayConfig,
                    )
                      .map(([k, v]) => `  ${k}: ${v};`)
                      .join("\n")}\n}`;
                    navigator.clipboard.writeText(cssText);
                    alert("配置已复制");
                  }}
                >
                  复制 CSS
                </Button>
              </div>
              <div className="theme-code-editor">
                <div className="editor-header">
                  <div className="editor-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="editor-filename">theme.css</div>
                </div>
                <div className="editor-content">
                  <span className="editor-keyword">{getSelector()}</span> {"{"}
                  {Object.entries(currentDisplayConfig).map(([key, value]) => (
                    <div key={key} className="editor-line">
                      <span className="editor-var">{key}</span>:{" "}
                      <span className="editor-val">{value}</span>;
                    </div>
                  ))}
                  {"}"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeChange;
