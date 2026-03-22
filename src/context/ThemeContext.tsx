import { createContext, useContext, useEffect, useState } from "react";
import { ThemeMode } from "../types/Enum";

// 定义变量元数据，包含中文描述
export const THEME_METADATA: Record<keyof CustomThemeConfig, string> = {
  "--bg-layout": "页面大背景",
  "--bg-card": "卡片容器背景",
  "--bg-sidebar": "侧边栏背景",
  "--bg-elevated": "浮起层背景(如下拉框)",
  "--bg-input": "输入框背景",
  "--text-main": "主文字颜色",
  "--text-subtle": "次要描述文字",
  "--text-muted": "极弱辅助文字",
  "--text-input": "输入框文字颜色", // 新增
  "--primary-color": "品牌强调主色",
  "--border-color": "装饰线条与边框",
};

export interface CustomThemeConfig {
  "--bg-layout": string;
  "--bg-card": string;
  "--bg-sidebar": string;
  "--bg-elevated": string;
  "--bg-input": string;
  "--text-main": string;
  "--text-subtle": string;
  "--text-muted": string;
  "--text-input": string; // 新增
  "--primary-color": string;
  "--border-color": string;
}

export const LIGHT_DEFAULTS: CustomThemeConfig = {
  "--bg-layout": "#f3f4f6",
  "--bg-card": "#ffffff",
  "--bg-sidebar": "#111827",
  "--bg-elevated": "#ffffff",
  "--bg-input": "#ffffff",
  "--text-main": "#111827",
  "--text-subtle": "#4b5563",
  "--text-muted": "#9ca3af",
  "--text-input": "#111827", // 新增
  "--primary-color": "#6366f1",
  "--border-color": "#e5e7eb",
};

export const DARK_DEFAULTS: CustomThemeConfig = {
  "--bg-layout": "#030712",
  "--bg-card": "#0f172a",
  "--bg-sidebar": "#030712",
  "--bg-elevated": "#1e293b",
  "--bg-input": "#111827",
  "--text-main": "#f9fafb",
  "--text-subtle": "#9ca3af",
  "--text-muted": "#6b7280",
  "--text-input": "#f9fafb", // 新增
  "--primary-color": "#818cf8",
  "--border-color": "#1f2937",
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: "light" | "dark" | "custom";
  customConfig: CustomThemeConfig;
  setCustomConfig: (config: CustomThemeConfig) => void;
  lastBasePreset: "light" | "dark";
  setLastBasePreset: (base: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("app-theme") as ThemeMode) || ThemeMode.SYSTEM;
  });

  const [customConfig, setCustomConfigState] = useState<CustomThemeConfig>(
    () => {
      const saved = localStorage.getItem("custom-theme-config");
      // 如果保存的配置里没有 --text-input，我们需要合并一下默认值，防止报错
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed["--text-input"]) {
          return { ...DARK_DEFAULTS, ...parsed };
        }
        return parsed;
      }
      return DARK_DEFAULTS;
    },
  );

  const [lastBasePreset, setLastBasePresetState] = useState<"light" | "dark">(
    () => {
      return (
        (localStorage.getItem("last-base-preset") as "light" | "dark") || "dark"
      );
    },
  );

  const [resolvedTheme, setResolvedTheme] = useState<
    "light" | "dark" | "custom"
  >("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      Object.keys(customConfig).forEach((key) =>
        document.documentElement.style.removeProperty(key),
      );

      if (theme === ThemeMode.CUSTOM) {
        setResolvedTheme("custom");
        document.documentElement.setAttribute("data-theme", "custom");
        Object.entries(customConfig).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
      } else {
        const effective =
          theme === ThemeMode.SYSTEM
            ? mediaQuery.matches
              ? "dark"
              : "light"
            : (theme as "light" | "dark");

        setResolvedTheme(effective);
        document.documentElement.setAttribute("data-theme", effective);
      }
      localStorage.setItem("app-theme", theme);
    };

    applyTheme();
    if (theme === ThemeMode.SYSTEM) {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme, customConfig]);

  const setCustomConfig = (config: CustomThemeConfig) => {
    setCustomConfigState(config);
    localStorage.setItem("custom-theme-config", JSON.stringify(config));
  };

  const setLastBasePreset = (base: "light" | "dark") => {
    setLastBasePresetState(base);
    localStorage.setItem("last-base-preset", base);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: setThemeState,
        resolvedTheme,
        customConfig,
        setCustomConfig,
        lastBasePreset,
        setLastBasePreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
