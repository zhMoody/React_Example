import { ProgressInfo } from "./types";

export const fetchRequest = async (
  url: string,
  onProgress: (info: ProgressInfo) => void,
): Promise<Blob> => {
  const response = await fetch(`${url}?t=${Date.now()}`);

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const total = parseInt(response.headers.get("content-length") || "0", 10);
  const reader = response.body?.getReader();

  if (!reader) throw new Error("Fetch response body not readable");

  let loaded = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (total > 0) {
      onProgress({
        loaded,
        total,
        percent: Math.round((loaded / total) * 100),
      });
    } else {
      // 如果没有 total，只传 loaded
      onProgress({
        loaded,
        total: 0,
        percent: 0,
      });
    }
  }

  return new Blob(chunks);
};
