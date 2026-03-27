import { ProgressInfo } from "./types";

export const xhrRequest = (
  url: string,
  onProgress: (info: ProgressInfo) => void,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${url}?t=${Date.now()}`);
    xhr.responseType = "blob";

    xhr.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent,
        });
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`XHR failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("XHR network error"));
    xhr.send();
  });
};
