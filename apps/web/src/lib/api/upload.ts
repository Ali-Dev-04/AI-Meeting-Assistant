'use client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * PUT a File directly to object storage via a presigned URL, reporting progress.
 *
 * Why XHR and not fetch? The Fetch API has no upload-progress event. XMLHttpRequest
 * does, which lets us render a real progress bar for multi-hundred-MB uploads.
 */
export function uploadFileToStorage(
  url: string,
  file: File,
  headers?: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (HTTP ${xhr.status})`));

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
