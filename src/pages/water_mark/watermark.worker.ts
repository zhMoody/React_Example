/**
 * 暗水印处理 Worker
 * 逻辑：在像素的 R 通道最低位嵌入信息
 */
const ctx: Worker = self as any;

ctx.onmessage = (e: MessageEvent) => {
  const { imageData, text } = e.data;
  const data = imageData.data;

  // 简单的演示：将文字转为二进制流
  const textBinary = text
    .split("")
    .map((char: string) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");

  let bitIndex = 0;
  // 遍历像素，修改 R 通道的最低有效位 (LSB)
  for (let i = 0; i < data.length; i += 4) {
    if (bitIndex < textBinary.length) {
      const bit = parseInt(textBinary[bitIndex]);
      // 强制将最低位设为 bit (0 或 1)
      data[i] = (data[i] & 0xfe) | bit;
      bitIndex++;
    } else {
      break;
    }
  }

  ctx.postMessage({ imageData }, [imageData.data.buffer]);
};
