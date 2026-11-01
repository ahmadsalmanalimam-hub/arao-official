// Cloudinary Video Service
// Uses Vite environment variables: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME and import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'yfofc6io';
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'arao_unsigned';

console.log('CloudName:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, 'Preset:', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  duration?: number;
  width?: number;
  height?: number;
  created_at: string;
}

export interface UploadProgressInfo {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBps: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bps: number): string {
  if (bps <= 0) return 'Calculating...';
  if (bps < 1024) return `${Math.round(bps)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Validates video file format and size (50MB maximum)
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/3gpp',
    'video/ogg'
  ];

  if (!file.type.startsWith('video/') && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid video format (MP4, MOV, WebM, etc.).'
    };
  }

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'Video too large, compress to under 50MB'
    };
  }

  return { valid: true };
}

/**
 * Direct unsigned upload to Cloudinary using XMLHttpRequest for real byte-level progress,
 * 120-second request timeout, and 30-second stall auto-cancellation.
 */
export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgressInfo) => void,
  onAbortHandle?: (abortFn: () => void) => void
): Promise<CloudinaryUploadResponse> {
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Video too large, compress to under 50MB');
  }

  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Video too large, compress to under 50MB');
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'yfofc6io';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'arao_unsigned';
  console.log('CloudName:', cloudName, 'Preset:', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Initial 0% progress with accurate total size
    if (onProgress) {
      onProgress({
        percent: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        speedBps: 0
      });
    }

    // 120 seconds total timeout
    xhr.timeout = 120000;

    let lastProgressTimestamp = Date.now();
    let lastLoaded = 0;
    let isFinished = false;

    // 30 seconds stall detector: if no bytes progress in 30 seconds, auto-cancel
    const stallInterval = setInterval(() => {
      if (isFinished) return;
      const secondsSinceProgress = (Date.now() - lastProgressTimestamp) / 1000;
      if (secondsSinceProgress >= 30) {
        clearInterval(stallInterval);
        isFinished = true;
        try {
          xhr.abort();
        } catch {}
        reject(new Error('Upload failed, try smaller video or better network'));
      }
    }, 1000);

    xhr.upload.onprogress = (event) => {
      if (isFinished) return;
      if (event.lengthComputable) {
        const now = Date.now();
        const timeDiffSeconds = Math.max(0.1, (now - lastProgressTimestamp) / 1000);
        const bytesDiff = Math.max(0, event.loaded - lastLoaded);
        const currentSpeed = bytesDiff / timeDiffSeconds;

        lastProgressTimestamp = now;
        lastLoaded = event.loaded;

        // Calculate real percentage from actual bytes uploaded
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));

        if (onProgress) {
          onProgress({
            percent,
            loadedBytes: event.loaded,
            totalBytes: event.total,
            speedBps: currentSpeed
          });
        }
      }
    };

    xhr.onload = () => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(stallInterval);

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) {
            onProgress({
              percent: 100,
              loadedBytes: file.size,
              totalBytes: file.size,
              speedBps: 0
            });
          }
          resolve(data as CloudinaryUploadResponse);
        } else {
          const errMsg = data.error?.message || `Upload failed with status ${xhr.status}`;
          console.error('[Cloudinary Upload Error]:', errMsg);
          if (errMsg.toLowerCase().includes('preset')) {
            reject(
              new Error(
                'Upload preset not found. Go to Cloudinary > Settings > Upload > Add upload preset named arao_unsigned (unsigned mode)'
              )
            );
          } else {
            reject(new Error('Upload failed, try smaller video or better network'));
          }
        }
      } catch (e) {
        reject(new Error('Upload failed, try smaller video or better network'));
      }
    };

    xhr.onerror = () => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(stallInterval);
      reject(new Error('Upload failed, try smaller video or better network'));
    };

    xhr.ontimeout = () => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(stallInterval);
      reject(new Error('Upload failed, try smaller video or better network'));
    };

    xhr.onabort = () => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(stallInterval);
      reject(new Error('Upload cancelled.'));
    };

    if (onAbortHandle) {
      onAbortHandle(() => {
        if (!isFinished) {
          isFinished = true;
          clearInterval(stallInterval);
          try {
            xhr.abort();
          } catch {}
        }
      });
    }

    xhr.open('POST', endpoint, true);
    xhr.send(formData);
  });
}

/**
 * Generates an optimized Cloudinary video streaming URL with f_auto,q_auto
 */
export function getOptimizedVideoUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/f_auto,q_auto/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

/**
 * Returns a quality-adjusted video streaming URL
 */
export function getVideoQualityUrl(
  url: string,
  quality: 'auto' | '1080p' | '720p' | '480p' | '360p'
): string {
  if (!url || !url.includes('cloudinary.com')) return url;

  const qualityMap: Record<string, string> = {
    '1080p': 'f_auto,q_auto,w_1920',
    '720p': 'f_auto,q_auto,w_1280',
    '480p': 'f_auto,q_auto,w_854',
    '360p': 'f_auto,q_auto,w_640',
    'auto': 'f_auto,q_auto'
  };

  const transform = qualityMap[quality] || 'f_auto,q_auto';
  const baseUploadRegex = /\/upload\/(?:[a-zA-Z0-9_,:]+\/)?/;
  return url.replace(baseUploadRegex, `/upload/${transform}/`);
}

/**
 * Generates a thumbnail image URL from a Cloudinary video URL or public ID
 */
export function getCloudinaryThumbnailUrl(videoUrlOrPublicId: string): string {
  if (!videoUrlOrPublicId) return '';
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'yfofc6io';
  if (videoUrlOrPublicId.startsWith('http')) {
    const withoutExt = videoUrlOrPublicId.replace(/\.[^/.]+$/, '');
    if (videoUrlOrPublicId.includes('cloudinary.com')) {
      return withoutExt.replace('/upload/', '/upload/so_0,w_600,c_fill,g_auto,f_auto,q_auto/') + '.jpg';
    }
    return videoUrlOrPublicId;
  }
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_600,c_fill,g_auto,f_auto,q_auto/${videoUrlOrPublicId}.jpg`;
}

/**
 * Real Video File Download using Fetch + Blob with progress reporting
 */
export async function downloadVideoFile(
  videoUrl: string,
  filename: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const safeFilename = (filename || 'arao_video').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetName = safeFilename.endsWith('.mp4') ? safeFilename : `${safeFilename}.mp4`;

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Download response status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      const blob = await response.blob();
      triggerBlobDownload(blob, targetName);
      if (onProgress) onProgress(100);
      return;
    }

    const reader = response.body.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (total > 0 && onProgress) {
          onProgress(Math.min(99, Math.round((received / total) * 100)));
        }
      }
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
    triggerBlobDownload(blob, targetName);
    if (onProgress) onProgress(100);
  } catch (err) {
    console.error('Direct download stream error, attempting fallback:', err);
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = targetName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }, 2500);
}
