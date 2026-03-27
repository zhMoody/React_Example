import { useState, useCallback, useEffect, useRef, ChangeEvent, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Button, {
  ButtonVariant,
  ButtonSize,
} from "../../components/common/Button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PDF.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DEFAULT_PDF = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";

/**
 * 内核原生渲染模式 - 强化高度约束
 */
const NativePDF = ({ source }: { source: string | File | null }) => {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    let activeUrl = "";
    const load = async () => {
      if (!source) return;
      if (source instanceof File) {
        activeUrl = URL.createObjectURL(source);
      } else {
        try {
          const res = await fetch(source);
          const blob = await res.blob();
          activeUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        } catch {
          activeUrl = source;
        }
      }
      setBlobUrl(activeUrl);
    };
    load();
    return () => { if (activeUrl) URL.revokeObjectURL(activeUrl); };
  }, [source]);

  if (!source) return <div className="empty-state">:: 等待载入文档流...</div>;

  return (
    <div className="native-viewer-wrapper" style={{ height: '100%', width: '100%' }}>
      <embed
        src={`${blobUrl}#toolbar=1`}
        type="application/pdf"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      />
    </div>
  );
};

/**
 * 精细化解析引擎 (pdf.js) - 强化高度约束
 */
const PluginPDF = ({ source }: { source: string | File | null }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.9);
  const [enableText, setEnableText] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const pageNum = Number(entry.target.getAttribute("data-page"));
            setCurrentPage(pageNum);
          }
        });
      },
      { root: scrollRef.current, threshold: 0.5 }
    );

    const timeoutId = setTimeout(() => {
      const pageElements = scrollRef.current?.querySelectorAll(".page-item-container");
      pageElements?.forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [numPages, scale, source]);

  if (!source) return <div className="empty-state">:: 渲染引擎待机中</div>;

  return (
    <div className="plugin-viewer-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="modern-toolbar">
        <div className="toolbar-controls">
          <Button size={ButtonSize.SM} variant={ButtonVariant.Ghost} onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}>－</Button>
          <span className="scale-text">{Math.round(scale * 100)}%</span>
          <Button size={ButtonSize.SM} variant={ButtonVariant.Ghost} onClick={() => setScale((s) => Math.min(s + 0.2, 2.0))}>＋</Button>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <label className="text-toggle" style={{ fontSize: '0.7rem', color: '#888', cursor: 'pointer' }}>
            <input type="checkbox" checked={enableText} onChange={(e) => setEnableText(e.target.checked)} />
            <span>&nbsp;文本图层分析</span>
          </label>
          <span className="page-count" style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#fff' }}>
            P_IDENT: <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>{currentPage}</span> / {numPages}
          </span>
        </div>
      </div>

      <div className="scroll-viewport" ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        <Document
          file={source}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="modern-loader">执行数据流解构...</div>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div key={`page_${index + 1}`} className="page-item-container" data-page={index + 1}>
              <Page
                pageNumber={index + 1}
                scale={scale}
                width={500}
                renderTextLayer={enableText}
                renderAnnotationLayer={enableText}
                loading={<div className="page-skeleton" style={{ height: 600 * scale }}>:: 同步页面 {index + 1}...</div>}
              />
              <div className="page-label">PAGE_0x{String(index + 1).padStart(2, '0')}</div>
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
};

export const PDFRender = () => {
  const [pdfSource, setPdfSource] = useState<string | File | null>(null);
  const [inputUrl, setInputUrl] = useState("");

  const handleUrlSubmit = () => {
    if (inputUrl.trim()) setPdfSource(inputUrl.trim());
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === "application/pdf") {
      setPdfSource(file);
      setInputUrl("");
    }
  };

  const currentTime = useMemo(() => new Date().toLocaleTimeString(), []);

  return (
    <div className="pdf-container">
      <header className="pdf-header">
        <div className="lab-title-group">
          <h1>文档解构实验室.sys</h1>
          <p>多维 PDF 渲染引擎性能对比：内核原生驱动 vs 精细化插件解析。</p>
        </div>
        <div className="lab-status">
          <span className="status-dot"></span>
          解析系统在线 // {currentTime}
        </div>
      </header>

      <section className="pdf-controls">
        <div className="control-group">
          <label className="control-label">网络链路寻址</label>
          <div className="control-row">
            <input
              type="text"
              className="input-url"
              placeholder="请输入远程 PDF 资源定位符 (URL)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <Button variant={ButtonVariant.Primary} onClick={handleUrlSubmit}>初始化加载</Button>
            <Button variant={ButtonVariant.Secondory} onClick={() => { setInputUrl(DEFAULT_PDF); setPdfSource(DEFAULT_PDF); }}>载入测试序列</Button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">本地数据导入</label>
          <div className="control-row">
            <label className="btn-upload-label">
              :: 执行本地二进制文件导入
              <input type="file" accept=".pdf" hidden onChange={handleFileUpload} />
            </label>
            {pdfSource instanceof File && (
              <span className="file-ident-tag" style={{ marginLeft: "12px", fontFamily: 'monospace' }}>
                识别码: {pdfSource.name}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="preview-grid">
        <div className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_01</span>
              <span className="module-complexity">模式: 内核原生渲染 (Embed)</span>
            </div>
            <div className="module-title">
              <h3>底层驱动渲染模式</h3>
            </div>
          </div>
          <div className="card-tips">
            <div className="tip-item pro">:: 优势: 零计算依赖，极速 IO 响应，支持完整原生交互。</div>
            <div className="tip-item con">:: 限制: 视觉图层不可定制，不同终端行为存在偏移。</div>
          </div>
          <div className="module-viewport">
            <NativePDF source={pdfSource} />
          </div>
        </div>

        <div className="lab-module">
          <div className="module-header">
            <div className="module-meta">
              <span className="module-no">实验模块_02</span>
              <span className="module-complexity">模式: 精细化解析引擎 (pdf.js)</span>
            </div>
            <div className="module-title">
              <h3>应用层解析引擎</h3>
            </div>
          </div>
          <div className="card-tips">
            <div className="tip-item pro">:: 优势: 高度可编程，全平台渲染一致性，支持动态图层重写。</div>
            <div className="tip-item con">:: 限制: 初始解构耗时较长，大规模矢量图层内存占用波动。</div>
          </div>
          <div className="module-viewport">
            <PluginPDF source={pdfSource} />
          </div>
        </div>
      </div>
    </div>
  );
};
