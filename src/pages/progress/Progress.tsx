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
      <h2>原生网络数据流监控实验</h2>

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
        <h4>技术解析</h4>
        <div className="principle-grid">
          <div className="principle-item">
            <h5 className="xhr-text">XMLHttpRequest (XHR)</h5>
            <ul>
              <li>
                <strong>事件驱动：</strong> 浏览器原生支持 <code>progress</code>{" "}
                事件，每当接收到新数据包时自动触发。
              </li>
              <li>
                <strong>内置缓冲：</strong> 设置{" "}
                <code>responseType: 'blob'</code>{" "}
                后，浏览器负责内部缓冲和二进制数据合并。
              </li>
              <li>
                <strong>成熟全能：</strong> 是目前实现
                <strong>上传进度监控</strong>的唯一标准方案。
              </li>
            </ul>
          </div>

          <div className="principle-item">
            <h5 className="fetch-text">Fetch (ReadableStream)</h5>
            <ul>
              <li>
                <strong>流式控制：</strong> 响应体是一个{" "}
                <code>ReadableStream</code>，需要通过 <code>getReader()</code>{" "}
                获取控制器。
              </li>
              <li>
                <strong>手动累加：</strong> 通过循环调用{" "}
                <code>reader.read()</code> 逐块读取内存中的 <code>chunk</code>{" "}
                并手动计算。
              </li>
              <li>
                <strong>高阶优势：</strong>{" "}
                允许在数据未下载完时就开始处理，支持流式视频播放或解析超大
                JSON。
              </li>
            </ul>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <h5>核心功能对比矩阵</h5>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>功能点</th>
                <th>XHR</th>
                <th>Fetch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>监控请求进度 (上传)</td>
                <td className="check">✅ 支持</td>
                <td className="unsupported">❌ 不支持</td>
              </tr>
              <tr>
                <td>监控响应进度 (下载)</td>
                <td className="check">✅ 支持</td>
                <td className="check">✅ 支持 (需手动)</td>
              </tr>
              <tr>
                <td>Service Worker 兼容</td>
                <td className="unsupported">❌ 不可用</td>
                <td className="check">✅ 完美兼容</td>
              </tr>
              <tr>
                <td>流处理 (Streams)</td>
                <td className="unsupported">❌ 不支持</td>
                <td className="check">✅ 原生支持</td>
              </tr>
              <tr>
                <td>请求取消</td>
                <td className="check">✅ xhr.abort()</td>
                <td className="check">✅ AbortController</td>
              </tr>
              <tr>
                <td>Cookie/重定向控制</td>
                <td className="unsupported">❌ 有限</td>
                <td className="check">✅ 深度控制</td>
              </tr>
              <tr>
                <td>API 风格</td>
                <td>Event-based</td>
                <td>Promise-based</td>
              </tr>
              <tr>
                <td>未来活跃度</td>
                <td className="text-muted">停止更新</td>
                <td className="text-active">不断更新</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Progress;
