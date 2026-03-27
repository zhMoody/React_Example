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

  const captureStage = async () => {
    if (!stageRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(stageRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
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

  const captureFullScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
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
    } catch {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!imgUrl) return;
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    alert("像素数据已复制到剪贴板");
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
        <div className="lab-title-group">
          <h1>数字资产捕获终端.sys</h1>
          <p>基于像素寻址的 DOM 序列化与全屏视频流捕获引擎。</p>
        </div>
        <div className="engine-bar">
          <Button
            variant={ButtonVariant.Primary}
            onClick={captureStage}
            loading={loading}
            icon="📸"
          >
            执行局部采样
          </Button>
          <Button 
            variant={ButtonVariant.Secondory} 
            onClick={captureFullScreen}
            icon="🎞️"
          >
            捕获全屏视频流
          </Button>
        </div>
      </header>

      <main className="shot-main">
        <section className="stage-section">
          <div className="section-label">采集舞台 :: THE_STAGE</div>
          <div className="capture-box" id="capture-stage">
            <div className="lab-card" ref={stageRef}>
              <div className="lab-card-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="lab-card-body">
                <h2>像素分析报告</h2>
                <p>
                  当前系统正在进行 CSS 变量穿透测试。所有的色彩深度、透明度及边框定义均遵循实验室全局协议。
                </p>
                <div className="status-badge">采样就绪 (READY)</div>
              </div>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <div className="section-label">输出缓冲区 :: THE_BUFFER</div>
          <div className="result-card">
            <div
              className="img-container checkerboard-bg"
              onClick={() => imgUrl && setShowModal(true)}
            >
              {imgUrl ? (
                <img src={imgUrl} alt="采样结果" title="点击放大观察像素细节" />
              ) : (
                <div className="placeholder-text">:: 等待采样脉冲指令...</div>
              )}
            </div>
            {imgUrl && (
              <div className="action-bar">
                <Button size={ButtonSize.SM} onClick={copyToClipboard} variant={ButtonVariant.Ghost}>
                  像素复制
                </Button>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.SM}
                  onClick={downloadImage}
                >
                  存入磁盘
                </Button>
                <Button
                  variant={ButtonVariant.Danger}
                  size={ButtonSize.SM}
                  onClick={() => setImgUrl(null)}
                >
                  清除缓存
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="history-footer">
        <div className="section-label">捕获馈送序列 :: HISTORY_FEED</div>
        <div className="history-list">
          {history.map((url, i) => (
            <div
              key={i}
              className="history-item checkerboard-bg"
              onClick={() => setImgUrl(url)}
            >
              <img src={url} alt={`历史快照 0x${i.toString(16)}`} />
              <button
                className="del-btn"
                onClick={(e) => removeFromHistory(i, e)}
                title="移除此记录"
              >
                ×
              </button>
            </div>
          ))}
          {history.length === 0 && (
            <div className="history-empty" style={{ width: '100%', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
              :: 当前序列为空 (NO_DATA)
            </div>
          )}
        </div>
      </footer>

      {showModal && imgUrl && (
        <div className="shot-modal" onClick={() => setShowModal(false)}>
          <div
            className="modal-content checkerboard-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={imgUrl} alt="全尺寸快照" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Screenshot;
