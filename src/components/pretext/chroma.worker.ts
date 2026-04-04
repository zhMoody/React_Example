/**
 * 避障分析 + 掩码生成 Worker
 */
self.onmessage = (e: MessageEvent) => {
  const { imageData, AW, AH } = e.data;
  const pixels = imageData.data;
  const profile = new Array(AH).fill(null).map(() => ({ min: AW, max: 0 }));

  // 在 Worker 中处理低分辨率抠像，生成黑白掩码
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const isGreen = g > 65 && g > r * 1.1 && g > b * 1.1;

    if (isGreen) {
      // 绿色背景设为完全透明黑色
      pixels[i] = pixels[i+1] = pixels[i+2] = 0;
      pixels[i + 3] = 0;
    } else {
      // 人物区域设为不透明白色 (用于遮罩)
      pixels[i] = pixels[i+1] = pixels[i+2] = 255;
      pixels[i + 3] = 255;

      const idx = i / 4;
      const x = idx % AW, y = Math.floor(idx / AW);
      // 避障逻辑排除边缘
      if (x > 5 && x < AW - 5 && y > 5 && y < AH - 5) {
        if (x < profile[y].min) profile[y].min = x;
        if (x > profile[y].max) profile[y].max = x;
      }
    }
  }
  self.postMessage({ imageData, profile }, [imageData.data.buffer]);
};
