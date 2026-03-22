import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import Button, {
  ButtonSize,
  ButtonVariant,
} from "../../components/common/Button";
import "./ScreenShot.css";

export const Screenshot: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("shot-history-simple");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (url: string) => {
    const newHistory = [url, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("shot-history-simple", JSON.stringify(newHistory));
  };

  const removeFromHistory = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    localStorage.setItem("shot-history-simple", JSON.stringify(newHistory));
  };

  // html2canvas 局部截图
  const captureStage = async () => {
    if (!stageRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(stageRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("capture-stage");
          if (el) {
            const elements = el.getElementsByTagName("*");
            for (let i = 0; i < elements.length; i++) {
              const item = elements[i] as HTMLElement;
              const style = window.getComputedStyle(item);
              if (style.color) item.style.color = style.color;
              if (style.backgroundColor)
                item.style.backgroundColor = style.backgroundColor;
              if (style.borderColor) item.style.borderColor = style.borderColor;
            }
          }
        },
      });
      const url = canvas.toDataURL("image/png");
      setImgUrl(url);
      saveToHistory(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  //  浏览器录制 (全屏截图)
  const captureFullScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setLoading(true);
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const url = canvas.toDataURL("image/png");
        setImgUrl(url);
        saveToHistory(url);
        stream.getTracks().forEach((t) => t.stop());
        setLoading(false);
      }, 800);
    } catch (e) {
      setLoading(false);
    }
  };

  // 通用动作
  const copyToClipboard = async () => {
    if (!imgUrl) return;
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    alert("已复制到剪贴板");
  };

  const downloadImage = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `capture-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="simple-shot-container">
      <header className="shot-header">
        <h1>像素实验室</h1>
        <div className="engine-bar">
          <Button
            variant={ButtonVariant.Primary}
            onClick={captureStage}
            loading={loading}
          >
            📷 html2canvas 局部截图
          </Button>
          <Button variant={ButtonVariant.Secondory} onClick={captureFullScreen}>
            🖥️ 视频录制全屏截图
          </Button>
        </div>
      </header>

      <main className="shot-main">
        <section className="stage-section">
          <div className="label">采集对象</div>
          <div className="capture-box" ref={stageRef} id="capture-stage">
            <div className="lab-card">
              <div className="lab-card-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="lab-card-body">
                <h2>像素分析仪</h2>
                <p>
                  正在测试 CSS
                  变量穿透。所有的背景色、边框色和文字颜色均由当前主题变量控制，能够被截图引擎准确识别。
                </p>
                <div className="status-badge">READY TO CAPTURE</div>
              </div>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <div className="label">当前结果</div>
          <div className="result-card">
            <div
              className="img-container checkerboard-bg"
              onClick={() => imgUrl && setShowModal(true)}
            >
              {imgUrl ? (
                <img src={imgUrl} alt="Result" title="点击放大" />
              ) : (
                <div className="placeholder">等待截图...</div>
              )}
            </div>
            {imgUrl && (
              <div className="action-bar">
                <Button size={ButtonSize.SM} onClick={copyToClipboard}>
                  📋 复制
                </Button>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.SM}
                  onClick={downloadImage}
                >
                  📥 保存
                </Button>
                <Button
                  variant={ButtonVariant.Danger}
                  size={ButtonSize.SM}
                  onClick={() => setImgUrl(null)}
                >
                  🗑️ 移除
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="history-footer">
        <div className="label">历史记录</div>
        <div className="history-list">
          {history.map((url, i) => (
            <div
              key={i}
              className="history-item checkerboard-bg"
              onClick={() => setImgUrl(url)}
            >
              <img src={url} alt="History" />
              <button
                className="del-btn"
                onClick={(e) => removeFromHistory(i, e)}
              >
                ×
              </button>
            </div>
          ))}
          {history.length === 0 && (
            <div className="history-empty">暂无历史快照</div>
          )}
        </div>
      </footer>

      {showModal && imgUrl && (
        <div className="shot-modal" onClick={() => setShowModal(false)}>
          <div
            className="modal-content checkerboard-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={imgUrl} alt="Full size" />
            <div className="modal-close">点击背景关闭</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Screenshot;
