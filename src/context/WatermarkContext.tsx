import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  VisibleWaterMark,
  WatermarkMode,
} from "../pages/water_mark/VisibleWaterMark";

// 1. 定义 Context 类型
interface WatermarkConfig {
  text: string;
  fontSize?: number;
  opacity?: number;
  gap?: number;
  mode: WatermarkMode;
}

interface WatermarkContextType {
  isEnabled: boolean;
  config: WatermarkConfig;
  showWatermark: (config?: Partial<WatermarkConfig>) => void;
  hideWatermark: () => void;
  updateConfig: (config: Partial<WatermarkConfig>) => void;
}

const WatermarkContext = createContext<WatermarkContextType | undefined>(
  undefined,
);

// 2. Provider 组件
export const WatermarkProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState<WatermarkConfig>({
    text: "默认水印",
    fontSize: 16,
    opacity: 0.15,
    gap: 100,
    mode: "background", // 默认 background
  });

  const showWatermark = (newConfig?: Partial<WatermarkConfig>) => {
    if (newConfig) setConfig((prev) => ({ ...prev, ...newConfig }));
    setIsEnabled(true);
  };

  const hideWatermark = () => setIsEnabled(false);

  const updateConfig = (newConfig: Partial<WatermarkConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  return (
    <WatermarkContext.Provider
      value={{ isEnabled, config, showWatermark, hideWatermark, updateConfig }}
    >
      <div
        id="watermark-app-root"
        style={{ position: "relative", width: "100%", minHeight: "100vh" }}
      >
        {children}
        {isEnabled && <VisibleWaterMark {...config} />}
      </div>
    </WatermarkContext.Provider>
  );
};

// 3. 自定义 Hook
export const useWatermark = () => {
  const context = useContext(WatermarkContext);
  if (!context) {
    throw new Error("useWatermark must be used within a WatermarkProvider");
  }
  return context;
};
