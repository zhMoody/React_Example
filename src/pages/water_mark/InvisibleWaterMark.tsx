import { useRef, useState, useEffect } from "react";
import Button, { ButtonVariant } from "../../components/common/Button";

export const InvisibleWaterMark = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const myWorker = new Worker(
      new URL("./watermark.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    setWorker(myWorker);
    return () => myWorker.terminate();
  }, []);

  const handleEmbed = () => {
    if (!canvasRef.current || !worker) return;
    setStatus("processing");
    const ctx = canvasRef.current.getContext("2d", {
      willReadFrequently: true,
    });
    if (!ctx) return;

    ctx.fillStyle = "#f0f2f5";
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = "#333";
    ctx.font = "24px Arial";
    ctx.fillText("这是一张包含暗水印的背景图", 50, 150);

    const imageData = ctx.getImageData(0, 0, 400, 300);
    worker.postMessage({
      imageData,
      text: "SECRET_ID_12345",
    });

    worker.onmessage = (e) => {
      const { imageData: processedData } = e.data;
      ctx.putImageData(processedData, 0, 0);
      setStatus("done");
    };
  };

  const handleReveal = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, 400, 300);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const isBitSet = (r & 1) === 1;
      const val = isBitSet ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <div className="controls">
        <Button onClick={handleEmbed} loading={status === "processing"}>
          注入隐藏水印 (LSB)
        </Button>
        <Button
          variant={ButtonVariant.Secondory}
          onClick={handleReveal}
          disabled={status !== "done"}
        >
          显影 (揭开真相)
        </Button>
        <Button
          variant={ButtonVariant.Ghost}
          onClick={() => window.location.reload()}
        >
          重置
        </Button>
      </div>
      <p className="hint">点击注入后，肉眼无变化。点击显影可提取隐藏位信息。</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{ border: "1px solid #ccc", marginTop: "20px" }}
      />
    </div>
  );
};
