import { useState, useCallback, useEffect, useRef, ChangeEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Button, {
  ButtonVariant,
  ButtonSize,
} from "../../components/common/Button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PDF.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DEFAULT_PDF =
  "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";

/**
 * 原生实现组件
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
          activeUrl = URL.createObjectURL(
            new Blob([blob], { type: "application/pdf" }),
          );
        } catch {
          activeUrl = source;
        }
      }
      setBlobUrl(activeUrl);
    };
    load();
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [source]);

  if (!source) return <div className="empty-state">暂无预览内容</div>;

  return (
    <div className="native-viewer-wrapper">
      <embed
        src={`${blobUrl}#toolbar=1`}
        type="application/pdf"
        width="100%"
        height="100%"
      />
    </div>
  );
};

/**
 * 插件实现组件
 */
const PluginPDF = ({ source }: { source: string | File | null }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前滚动到的页码
  const [scale, setScale] = useState<number>(0.9);
  const [enableText, setEnableText] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setCurrentPage(1);
    },
    [],
  );

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
      {
        root: scrollRef.current,
        threshold: 0.5,
      },
    );

    const timeoutId = setTimeout(() => {
      const pageElements = scrollRef.current?.querySelectorAll(
        ".page-item-container",
      );
      pageElements?.forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [numPages, scale, source]);

  if (!source)
    return <div className="empty-state">请先上传或输入 PDF 地址</div>;

  return (
    <div className="plugin-viewer-container modern-theme">
      <div className="modern-toolbar">
        <div className="toolbar-controls">
          <Button
            size={ButtonSize.SM}
            variant={ButtonVariant.Ghost}
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
          >
            －
          </Button>
          <span className="scale-text">{Math.round(scale * 100)}%</span>
          <Button
            size={ButtonSize.SM}
            variant={ButtonVariant.Ghost}
            onClick={() => setScale((s) => Math.min(s + 0.2, 2.0))}
          >
            ＋
          </Button>
        </div>

        <div className="toolbar-right">
          <label className="text-toggle">
            <input
              type="checkbox"
              checked={enableText}
              onChange={(e) => setEnableText(e.target.checked)}
            />
            <span>文本选中</span>
          </label>
          <span className="page-count">
            <span style={{ color: "#409eff", fontWeight: "bold" }}>
              {currentPage}
            </span>{" "}
            / {numPages} 页
          </span>
        </div>
      </div>

      <div className="scroll-viewport" ref={scrollRef}>
        <Document
          file={source}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="modern-loader">解析中...</div>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`page_${index + 1}`}
              className="page-item-container"
              data-page={index + 1}
            >
              <Page
                pageNumber={index + 1}
                scale={scale}
                width={500}
                renderTextLayer={enableText}
                renderAnnotationLayer={enableText}
                loading={
                  <div
                    className="page-skeleton"
                    style={{ height: 600 * scale }}
                  >
                    加载中...
                  </div>
                }
              />
              <div className="page-label">{index + 1}</div>
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

  return (
    <div className="pdf-container">
      <header className="pdf-header">
        <h1>PDF 预览对比实验</h1>
        <p>
          Embed原生标签 <strong> VS </strong> pdf.js插件
        </p>
      </header>

      <section className="pdf-controls">
        <div className="control-group">
          <label className="control-label">在线地址预览</label>
          <div className="control-row">
            <input
              type="text"
              className="input-url"
              placeholder="请输入 PDF 链接"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <Button variant={ButtonVariant.Primary} onClick={handleUrlSubmit}>
              加载链接
            </Button>
            <Button
              variant={ButtonVariant.Secondory}
              onClick={() => {
                setInputUrl(DEFAULT_PDF);
                setPdfSource(DEFAULT_PDF);
              }}
            >
              示例 PDF
            </Button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">本地文件预览</label>
          <div className="control-row">
            <label className="btn-upload-label">
              选择本地 PDF 文件
              <input
                type="file"
                accept=".pdf"
                hidden
                onChange={handleFileUpload}
              />
            </label>
            {pdfSource instanceof File && (
              <span className="tag" style={{ marginLeft: "12px" }}>
                {pdfSource.name}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="preview-grid">
        <div className="preview-card">
          <div className="card-header">
            <h3>原生浏览器模式(Embed)</h3>
          </div>
          <div className="card-tips">
            <div className="tip-item pro">
              ✅ 零依赖，渲染性能极佳，功能丰富（打印/旋转/目录等）。
            </div>
            <div className="tip-item con">
              ❌ 无法定制 UI，无法禁止下载/打印，不同浏览器体验不一致。
            </div>
          </div>
          <div className="card-body">
            <NativePDF source={pdfSource} />
          </div>
        </div>
        <div className="preview-card">
          <div className="card-header">
            <h3>插件预览(pdf.js)</h3>
          </div>
          <div className="card-tips">
            <div className="tip-item pro">
              ✅ 高度可定制，权限完全可控（防下载/加水印），多端渲染一致。
            </div>
            <div className="tip-item con">
              ❌ 依赖包体积较大，功能需手动开发，极复杂文档解析有压力。
            </div>
          </div>
          <div className="card-body">
            <PluginPDF source={pdfSource} />
          </div>
        </div>
      </div>
    </div>
  );
};
