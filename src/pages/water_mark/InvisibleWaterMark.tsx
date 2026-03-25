import { useRef, useState } from "react";
import Button, { ButtonVariant } from "../../components/common/Button";

export const InvisibleWaterMark = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "embedded" | "revealed">(
    "idle",
  );
  const [secretText, setSecretText] = useState("TOP SECRET 007");

  const getCtx = () =>
    canvasRef.current?.getContext("2d", { willReadFrequently: true });

  // 1. 注入：使用极低透明度 (肉眼不可见色差)
  const handleEmbed = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;

    const { width, height } = canvasRef.current;

    // 清空并画背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 画一些干扰内容，让它看起来像张普通图
    ctx.fillStyle = "#333";
    ctx.font = "20px Arial";
    ctx.fillText("这是一张受保护的机密图片", 50, 100);
    ctx.fillRect(50, 120, 300, 2);

    // 注入暗水印：使用极低色差 (255 vs 254)
    // 我们将文字画在 R 通道，稍微减掉 1 点值
    ctx.fillStyle = "rgba(254, 255, 255, 1)";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(secretText, width / 2, height / 2 + 50);

    setStatus("embedded");
  };

  // 2. 显影：增强色差
  const handleReveal = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;

    const { width, height } = canvasRef.current;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // 如果 R 通道不是 255 (说明是我们涂过的地方)
      if (data[i] < 255) {
        data[i] = 255; // 变红
        data[i + 1] = 0; //
        data[i + 2] = 0; //
      } else {
        // 否则变灰
        const gray = 200;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setStatus("revealed");
  };

  // 3. 重置：逻辑清空，不刷新页面
  const handleReset = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setStatus("idle");
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={secretText}
          onChange={(e) => setSecretText(e.target.value)}
          placeholder="输入要隐藏的文字"
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid var(--border-color)",
          }}
        />
        <Button onClick={handleEmbed}>注入暗水印</Button>
        <Button
          variant={ButtonVariant.Secondory}
          onClick={handleReveal}
          disabled={status !== "embedded"}
        >
          显影 (揭开真相)
        </Button>
        <Button variant={ButtonVariant.Ghost} onClick={handleReset}>
          重置画布
        </Button>
      </div>

      <p className="hint">
        {status === "idle" && "第一步：输入暗号并点击注入"}
        {status === "embedded" &&
          "已注入！现在图片看起来很干净，点击显影试试？"}
        {status === "revealed" && "真相大白！隐藏的文字已通过像素差值提取。"}
      </p>

      <canvas
        ref={canvasRef}
        width={500}
        height={300}
        style={{
          border: "1px solid var(--border-color)",
          marginTop: "20px",
          background: "#fff",
          boxShadow: "var(--shadow-main)",
        }}
      />
    </div>
  );
};
