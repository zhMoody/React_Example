/**
 * 暗水印处理 Worker
 * 逻辑：在像素的 R 通道最低位嵌入信息
 */
self.onmessage = (e: MessageEvent) => {
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
      // 如果原值是 254(二进制 ...1110)，bit是1 -> 变成 255
      // 如果原值是 255(二进制 ...1111)，bit是0 -> 变成 254
      data[i] = (data[i] & 0xfe) | bit;
      bitIndex++;
    } else {
      // 标记结束符：连续 8 个 0 的 R 通道 LSB 可能表示结束（此处仅为简化演示）
      break;
    }
  }

  self.postMessage({ imageData }, [imageData.data.buffer]);
};
