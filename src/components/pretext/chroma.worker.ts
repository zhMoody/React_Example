/**
 * 亚像素避障分析 Worker
 */
const ctx: Worker = self as any;

ctx.onmessage = (e: MessageEvent) => {
  const { imageData, SW, SH } = e.data;
  const pixels = imageData.data;
  const profile = new Array(SH);

  for (let y = 0; y < SH; y++) {
    const rowSpans: number[][] = [];
    let start = -1;
    const rowOffset = y * SW * 4;

    for (let x = 0; x < SW; x++) {
      const i = rowOffset + x * 4;
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];

      // 只要绿色不占绝对优势，就视为人物（障碍物）
      const isGreen = g > 55 && g > r * 1.05 && g > b * 1.05;
      const isPerson = !isGreen;

      if (isPerson && start === -1) {
        // 向左膨胀 8 像素，预留安全区
        start = Math.max(0, x - 8);
      } else if (!isGreen === false && start !== -1) {
        // 向右膨胀 8 像素
        rowSpans.push([start, Math.min(SW - 1, x + 8)]);
        start = -1;
      }
    }
    if (start !== -1) rowSpans.push([start, SW - 1]);
    profile[y] = rowSpans;
  }

  ctx.postMessage({ profile });
};
