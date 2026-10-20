import { useEffect, useMemo, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { drawFaceCutout } from './faceCutout'

export type FacePhase = 'off' | 'loading' | 'found' | 'missing' | 'multiple' | 'position' | 'error'
export interface FaceStatus { phase: FacePhase; message: string }

export function useFaceCutout(video: HTMLVideoElement | null, enabled: boolean) {
  const [status, setStatus] = useState<FaceStatus>({ phase: 'off', message: '顔検知は停止しています' })
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 320
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return { canvas, texture }
  }, [])
  useEffect(() => {
    if (!enabled || !video) {
      setStatus({ phase: 'off', message: 'カメラを開始すると顔を検知します' })
      return
    }
    let disposed = false
    let timer = 0
    let detector: FaceLandmarker | null = null
    let lastVideoTime = -1
    let phase: FacePhase = 'loading'
    const publish = (next: FacePhase, message: string) => {
      if (!disposed && phase !== next) { phase = next; setStatus({ phase: next, message }) }
    }
    const clear = () => {
      surface.canvas.getContext('2d')!.clearRect(0, 0, 256, 320)
      surface.texture.needsUpdate = true
    }
    clear()
    setStatus({ phase: 'loading', message: '顔検知モデルを読み込み中…' })
    const run = () => {
      if (disposed) return
      try {
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const result = detector!.detectForVideo(video, performance.now())
          if (result.faceLandmarks.length !== 1) {
            clear()
            if (result.faceLandmarks.length > 1) publish('multiple', '複数の顔を検知したため、実写を隠しています')
            else publish('missing', '顔が見つかりません。カメラを正面から見てください')
          } else {
            const drawn = drawFaceCutout(surface.canvas, video, result.faceLandmarks[0], video.videoWidth, video.videoHeight)
            surface.texture.needsUpdate = true
            publish(drawn ? 'found' : 'missing', drawn ? '顔を検知・鏡の中だけに合成中' : '顔が小さすぎます。カメラに近づいてください')
          }
        }
        // Prototype: synchronous inference, capped at 10Hz; no per-frame React state.
        timer = window.setTimeout(run, 100)
      } catch {
        clear()
        publish('error', '顔検知に失敗しました。カメラを停止して再試行してください')
      }
    }
    void (async () => {
      try {
        // Dev source is /src/*.ts; built Item chunks live at the item CDN root.
        const base = new URL(import.meta.env.DEV ? '../face-assets/' : './face-assets/', import.meta.url).href
        const files = await FilesetResolver.forVisionTasks(`${base}wasm`)
        const created = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: `${base}face_landmarker.task`, delegate: 'CPU' },
          runningMode: 'VIDEO', numFaces: 2,
          minFaceDetectionConfidence: 0.65, minFacePresenceConfidence: 0.65,
          minTrackingConfidence: 0.65,
        })
        if (disposed) { created.close(); return }
        detector = created
        run()
      } catch {
        if (!disposed) {
          clear()
          publish('error', '顔検知モデルを読み込めませんでした。再試行してください')
        }
      }
    })()
    return () => {
      disposed = true
      window.clearTimeout(timer)
      detector?.close()
      clear()
    }
  }, [video, enabled, surface])
  useEffect(() => () => surface.texture.dispose(), [surface])
  return { status, texture: surface.texture }
}
