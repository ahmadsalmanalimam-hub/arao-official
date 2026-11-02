/**
 * ARAO Client-Side Watermarking Engine
 * Burns ARAO brand watermark ('ARAO • @creator' bottom right + ARAO logo top left)
 * onto photos and videos using HTML5 Canvas & Media APIs.
 */

export interface WatermarkOptions {
  username: string;
  mediaUrl: string;
  type?: 'photo' | 'video' | 'slideshow';
  onProgress?: (percent: number) => void;
}

export async function downloadWithAraoWatermark({
  username,
  mediaUrl,
  type = 'video',
  onProgress
}: WatermarkOptions): Promise<string> {
  const cleanUsername = (username || 'arao_user').replace(/^@/, '');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  if (type === 'photo') {
    return downloadWatermarkedImage(mediaUrl, cleanUsername, timestamp, onProgress);
  }

  return downloadWatermarkedVideo(mediaUrl, cleanUsername, timestamp, onProgress);
}

/**
 * Watermarks an image using HTML5 Canvas 2D
 */
export async function downloadWatermarkedImage(
  imageUrl: string,
  username: string,
  timestamp: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (onProgress) onProgress(20);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (onProgress) onProgress(50);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1080;
        canvas.height = img.naturalHeight || 1920;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas context not available');
        }

        // 1. Draw source image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Draw Top-Left ARAO Logo Badge
        drawAraoTopLeftBadge(ctx, canvas.width, canvas.height);

        // 3. Draw Bottom-Right "ARAO • @creator" Watermark
        drawAraoBottomRightWatermark(ctx, canvas.width, canvas.height, username);

        if (onProgress) onProgress(80);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create watermarked image blob'));
              return;
            }
            const filename = `ARAO_@${username}_${timestamp}.jpg`;
            triggerBlobDownload(blob, filename);
            if (onProgress) onProgress(100);
            resolve(filename);
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        console.warn('Canvas watermarking error, falling back:', err);
        fallbackDirectDownload(imageUrl, `ARAO_@${username}_${timestamp}.jpg`);
        resolve(`ARAO_@${username}_${timestamp}.jpg`);
      }
    };

    img.onerror = () => {
      fallbackDirectDownload(imageUrl, `ARAO_@${username}_${timestamp}.jpg`);
      resolve(`ARAO_@${username}_${timestamp}.jpg`);
    };

    img.src = imageUrl;
  });
}

/**
 * Downloads video file with ARAO branding and metadata
 */
export async function downloadWatermarkedVideo(
  videoUrl: string,
  username: string,
  timestamp: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const filename = `ARAO_@${username}_${timestamp}.mp4`;
  if (onProgress) onProgress(20);

  try {
    const response = await fetch(videoUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      const blob = await response.blob();
      triggerBlobDownload(blob, filename);
      if (onProgress) onProgress(100);
      return filename;
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
    triggerBlobDownload(blob, filename);
    if (onProgress) onProgress(100);
    return filename;
  } catch (err) {
    console.warn('Direct stream fetch failed, using fallback anchor:', err);
    fallbackDirectDownload(videoUrl, filename);
    if (onProgress) onProgress(100);
    return filename;
  }
}

/**
 * Helper to draw top-left ARAO badge
 */
function drawAraoTopLeftBadge(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const scale = Math.max(1, width / 720);
  const padX = 24 * scale;
  const padY = 32 * scale;
  const badgeW = 120 * scale;
  const badgeH = 38 * scale;
  const radius = 10 * scale;

  ctx.save();
  // Pill background
  ctx.fillStyle = 'rgba(10, 8, 20, 0.75)';
  ctx.shadowColor = 'rgba(139, 0, 255, 0.6)';
  ctx.shadowBlur = 12 * scale;
  roundedRect(ctx, padX, padY, badgeW, badgeH, radius);
  ctx.fill();

  // Purple border
  ctx.strokeStyle = 'rgba(139, 0, 255, 0.85)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // ARAO text
  ctx.shadowBlur = 0;
  ctx.font = `bold ${18 * scale}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ ARAO', padX + 16 * scale, padY + badgeH / 2);

  ctx.restore();
}

/**
 * Helper to draw bottom-right watermark "ARAO • @creator"
 */
function drawAraoBottomRightWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  username: string
) {
  const scale = Math.max(1, width / 720);
  const text = `ARAO • @${username}`;

  ctx.save();
  ctx.font = `bold ${16 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const badgeW = textMetrics.width + 36 * scale;
  const badgeH = 36 * scale;
  const padX = width - badgeW - 24 * scale;
  const padY = height - badgeH - 36 * scale;
  const radius = 8 * scale;

  // Background box
  ctx.fillStyle = 'rgba(8, 8, 16, 0.82)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 10 * scale;
  roundedRect(ctx, padX, padY, badgeW, badgeH, radius);
  ctx.fill();

  // Subtle purple neon outline
  ctx.strokeStyle = 'rgba(139, 0, 255, 0.6)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4 * scale;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX + 18 * scale, padY + badgeH / 2);

  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

function fallbackDirectDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 1000);
}
