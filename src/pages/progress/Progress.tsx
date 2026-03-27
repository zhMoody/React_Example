import { FC, useState, useEffect } from "react";
import Button, { ButtonVariant } from "../../components/common/Button";
import { xhrRequest } from "./XHRRequest";
import { fetchRequest } from "./Fetch";
import "./Progress.css";
import { ProgressInfo } from "./types";

const TEST_URL =
  "https://fetch-progress.anthum.com/20kbps/images/sunrise-baseline.jpg";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const Progress: FC = () => {
  const [xhrInfo, setXhrInfo] = useState<ProgressInfo>({
    loaded: 0,
    total: 0,
    percent: 0,
  });
  const [fetchInfo, setFetchInfo] = useState<ProgressInfo>({
    loaded: 0,
    total: 0,
    percent: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 清理内存中的 Blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDownload = async (type: "xhr" | "fetch") => {
    try {
      setIsLoading(true);
      setPreviewUrl(null);

      const updateFn = type === "xhr" ? setXhrInfo : setFetchInfo;
      const requestFn = type === "xhr" ? xhrRequest : fetchRequest;

      // 重置对应进度
      updateFn({ loaded: 0, total: 0, percent: 0 });

      const blob = await requestFn(TEST_URL, (info) => updateFn(info));

      // 将结果转换为可见图片
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="progress-container">
      <h2>原生网络数据流监控</h2>

      <div className="main-layout">
        <div className="controls">
          <div className="progress-card">
            <div className="card-header">
              <h3>XMLHttpRequest</h3>
              <Button
                variant={ButtonVariant.Primary}
                onClick={() => handleDownload("xhr")}
                disabled={isLoading}
              >
                XHR 加载
              </Button>
            </div>
            <div className="stats">
              <span>已加载: {formatBytes(xhrInfo.loaded)}</span>
              <span>总量: {formatBytes(xhrInfo.total)}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill xhr"
                style={{ width: `${xhrInfo.percent}%` }}
              />
            </div>
            <div className="percent-text">{xhrInfo.percent}%</div>
          </div>

          <div className="progress-card">
            <div className="card-header">
              <h3>Fetch (ReadableStream)</h3>
              <Button
                variant={ButtonVariant.Secondory}
                onClick={() => handleDownload("fetch")}
                disabled={isLoading}
              >
                Fetch 加载
              </Button>
            </div>
            <div className="stats">
              <span>已加载: {formatBytes(fetchInfo.loaded)}</span>
              <span>总量: {formatBytes(fetchInfo.total)}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill fetch"
                style={{ width: `${fetchInfo.percent}%` }}
              />
            </div>
            <div className="percent-text">{fetchInfo.percent}%</div>
          </div>
        </div>

        <div className="preview-panel">
          <h4>数据结果预览 (Blob → ObjectURL)</h4>
          <div className="image-container">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Downloaded result"
                className="fade-in"
              />
            ) : (
              <div className="placeholder">
                {isLoading ? "数据传输中..." : "等待下载数据"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="debug-info">
        <p>工作原理：</p>
        <ul>
          <li>
            <strong>XHR:</strong> 监听 <code>xhr.onprogress</code>
            。这是传统的二进制流处理方式。
          </li>
          <li>
            <strong>Fetch:</strong> 通过 <code>response.body.getReader()</code>{" "}
            递归读取 <code>chunk</code>，在 JS 堆栈中手动拼接二进制分块。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Progress;
