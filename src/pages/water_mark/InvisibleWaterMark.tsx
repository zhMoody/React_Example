import { useRef, useState } from "react";
import Button, { ButtonVariant, ButtonSize } from "../../components/common/Button";

export const InvisibleWaterMark = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "embedded" | "revealed">(
    "idle",
  );
  const [secretText, setSecretText] = useState("TOP SECRET 007");

  const getCtx = () =>
    canvasRef.current?.getContext("2d", { willReadFrequently: true });

  const handleEmbed = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;

    const { width, height } = canvasRef.current;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#333";
    ctx.font = "20px Arial";
    ctx.fillText("这是一张受保护的机密图片", 50, 100);
    ctx.fillRect(50, 120, 300, 2);

    ctx.fillStyle = "rgba(254, 255, 255, 1)";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(secretText, width / 2, height / 2 + 50);

    setStatus("embedded");
  };

  const handleReveal = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;

    const { width, height } = canvasRef.current;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 255) {
        data[i] = 255; 
        data[i + 1] = 0; 
        data[i + 2] = 0; 
      } else {
        const gray = 200;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setStatus("revealed");
  };

  const handleReset = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setStatus("idle");
  };

  return (
    <div className="invisible-container">
      <div className="input-group">
        <div className="setting-item" style={{ flex: 1 }}>
          <input
            type="text"
            value={secretText}
            onChange={(e) => setSecretText(e.target.value)}
            placeholder="输入要隐藏的暗号..."
          />
        </div>
        <Button onClick={handleEmbed} size={ButtonSize.MD}>注入暗水印</Button>
        <Button
          variant={ButtonVariant.Primary}
          onClick={handleReveal}
          disabled={status !== "embedded"}
          size={ButtonSize.MD}
        >
          显影 (揭开真相)
        </Button>
        <Button variant={ButtonVariant.Ghost} onClick={handleReset} size={ButtonSize.MD}>
          重置
        </Button>
      </div>

      <div className={`status-box ${status === 'revealed' ? 'success' : 'info'}`}>
        {status === "idle" && "🕵️ 第一步：输入暗号并点击注入。"}
        {status === "embedded" &&
          "🔒 已完成像素级注入！现在图片看起来与普通图片无异，点击“显影”提取暗号。"}
        {status === "revealed" && "🎉 真相大白！隐藏的文字已通过 R 通道像素差值成功提取。"}
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={600}
          height={360}
        />
      </div>

      <p className="hint-text">
        技术原理：利用 LSB (Least Significant Bit) 思想，在 R 通道注入肉眼无法感知的微小色差值。
      </p>
    </div>
  );
};
