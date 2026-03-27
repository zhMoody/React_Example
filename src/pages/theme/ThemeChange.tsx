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
import { useMemo } from "react";

export const ThemeChange: React.FC = () => {
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
    const baseSource = lastBasePreset === "dark" ? DARK_DEFAULTS : LIGHT_DEFAULTS;
    setCustomConfig({ ...customConfig, [key]: baseSource[key] });
  };

  const getSelector = () => {
    if (theme === ThemeMode.CUSTOM) return ":root /* 自定义模式 */";
    if (resolvedTheme === "dark") return "[数据主题='暗色']";
    return ":root";
  };

  const currentTime = useMemo(() => new Date().toLocaleTimeString(), []);

  return (
    <div className="theme-lab-page">
      <header className="theme-lab-header">
        <div className="lab-title-group">
          <h1>主题视觉实验室.sys</h1>
          <p>CSS 变量实时寻址、全量配置导出与语义化色彩矩阵管理。</p>
        </div>
        <div className="lab-status" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          渲染引擎状态: 在线 // {currentTime}
        </div>
      </header>

      <section className="sticky-mode-switcher">
        <div className="theme-switcher">
          {[
            { mode: ThemeMode.SYSTEM, icon: "🖥️", label: "系统同步" },
            { mode: ThemeMode.LIGHT, icon: "☀️", label: "明亮模式" },
            { mode: ThemeMode.DARK, icon: "🌙", label: "暗色模式" },
            { mode: ThemeMode.CUSTOM, icon: "🎨", label: "实验性自定义" },
          ].map((item) => (
            <Button
              key={item.mode}
              variant={theme === item.mode ? ButtonVariant.Secondory : ButtonVariant.Ghost}
              className={`theme-btn ${theme === item.mode ? "active" : ""}`}
              onClick={() => setTheme(item.mode)}
            >
              <span className="label">{item.label}</span>
            </Button>
          ))}
        </div>
      </section>

      <div className="lab-content-grid">
        <div className="lab-editor-pane">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>色彩参数矩阵管理</h3>
              <div className="action-group" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="base-preset-hint" style={{ fontSize: '0.7rem' }}>
                  当前基准: <span className={`preset-tag ${lastBasePreset}`}>{lastBasePreset === "dark" ? "暗色" : "明亮"}</span>
                </div>
                <Button variant={ButtonVariant.Secondory} size={ButtonSize.SM} onClick={() => applyDefaults("light")}>导入明亮预设</Button>
                <Button variant={ButtonVariant.Secondory} size={ButtonSize.SM} onClick={() => applyDefaults("dark")}>导入暗色预设</Button>
              </div>
            </div>

            {!isCustomMode && (
              <div className="custom-hint">
                :: 系统提示: 当前处于预设只读模式。请在上方切换至 <strong>实验性自定义</strong> 模式以解锁参数编辑。
              </div>
            )}

            <div className="color-picker-grid">
              {Object.entries(currentDisplayConfig).map(([key, value]) => {
                const k = key as keyof CustomThemeConfig;
                return (
                  <div className={`picker-item ${!isCustomMode ? "disabled" : ""}`} key={k}>
                    <div className="picker-label-row">
                      <div className="label-main">
                        <span className="var-desc">{THEME_METADATA[k]}</span>
                        <span className="var-name">{k}</span>
                      </div>
                      {isCustomMode && (
                        <Button
                          variant={ButtonVariant.Ghost}
                          size={ButtonSize.SM}
                          onClick={() => resetSingleColor(k)}
                          title="恢复至当前基准值"
                          style={{ padding: 0, minWidth: "24px", height: "24px", opacity: 0.5 }}
                        >
                          ↺
                        </Button>
                      )}
                    </div>
                    <div className="picker-control">
                      <div className="color-swatch-wrapper" style={{ backgroundColor: value }}>
                        <input
                          type="color"
                          value={value}
                          disabled={!isCustomMode}
                          onChange={(e) => handleColorChange(k, e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        className="color-text-input"
                        value={value.toUpperCase()}
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
          <div className="dashboard-card code-section" style={{ height: '100%' }}>
            <div className="card-header">
              <h3>全量样式快照</h3>
              <Button
                size={ButtonSize.SM}
                variant={ButtonVariant.Primary}
                onClick={() => {
                  const cssText = `${getSelector()} {\n${Object.entries(currentDisplayConfig).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
                  navigator.clipboard.writeText(cssText);
                  alert("CSS 配置已成功复制到剪贴板");
                }}
              >
                复制配置
              </Button>
            </div>
            <div className="theme-code-editor">
              <div className="editor-header">
                <div className="editor-filename">VISUAL_CONFIG_SNAPSHOT.css</div>
              </div>
              <div className="editor-content">
                <span className="editor-keyword">{getSelector()}</span> {"{"}
                {Object.entries(currentDisplayConfig).map(([key, value]) => (
                  <div key={key} className="editor-line">
                    &nbsp;&nbsp;<span className="editor-var">{key}</span>:{" "}
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
  );
};
