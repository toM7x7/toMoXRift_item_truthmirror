import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// Ordered face oval from MediaPipe's face mesh topology.
export const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]

export function drawFaceCutout(canvas: HTMLCanvasElement, video: CanvasImageSource, points: NormalizedLandmark[], videoWidth: number, videoHeight: number) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const oval = FACE_OVAL.map(i => points[i])
  if (oval.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false
  const xs = oval.map(p => p.x * videoWidth)
  const ys = oval.map(p => p.y * videoHeight)
  const left = Math.min(...xs), top = Math.min(...ys)
  const width = Math.max(...xs) - left, height = Math.max(...ys) - top
  if (width < 12 || height < 16) return false
  const fit = Math.min((canvas.width - 10) / width, (canvas.height - 10) / height)
  const x = (canvas.width - width * fit) / 2, y = (canvas.height - height * fit) / 2
  ctx.save()
  // Mirror once here, independently of the full-camera texture's UV transform.
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.beginPath()
  oval.forEach((p, index) => {
    const px = x + (p.x * videoWidth - left) * fit
    const py = y + (p.y * videoHeight - top) * fit
    if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(video, left, top, width, height, x, y, width * fit, height * fit)
  ctx.restore()
  return true
}
