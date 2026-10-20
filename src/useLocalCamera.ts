import { useCallback, useEffect, useRef, useState } from 'react'
import { SRGBColorSpace, VideoTexture } from 'three'

export type CameraPhase = 'idle' | 'requesting' | 'live' | 'error'
export interface CameraStatus { phase: CameraPhase; message: string }
const idle: CameraStatus = { phase: 'idle', message: 'カメラは停止しています' }

function explain(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return 'カメラが許可されていません。ブラウザのカメラ設定を確認して、もう一度開始してください。'
  if (name === 'NotFoundError') return 'カメラが見つかりません。PCにWebカメラを接続してください。'
  if (name === 'NotReadableError') return 'カメラを開けません。他のアプリの使用状況を確認してください。'
  return 'カメラを開始できませんでした。接続とブラウザの設定を確認して再試行してください。'
}

export function useLocalCamera() {
  const [status, setStatus] = useState<CameraStatus>(idle)
  const [texture, setTexture] = useState<VideoTexture | null>(null)
  const session = useRef(0)
  const alive = useRef(false)
  const pending = useRef(false)
  const resource = useRef<{ stream: MediaStream; video: HTMLVideoElement; texture: VideoTexture | null } | null>(null)

  const release = useCallback(() => {
    const current = resource.current
    resource.current = null
    if (!current) return
    current.stream.getTracks().forEach(track => { track.onended = null; track.stop() })
    current.video.pause()
    current.video.srcObject = null
    current.texture?.dispose()
  }, [])

  const stop = useCallback(() => {
    session.current++
    release()
    if (alive.current) { setTexture(null); setStatus(idle) }
  }, [release])

  const start = useCallback(async () => {
    // Keep only one permission request outstanding, including after cancellation.
    if (pending.current || resource.current || !alive.current) return
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus({ phase: 'error', message: 'この環境ではカメラを使えません。PCのChrome / EdgeでlocalhostまたはHTTPSから開いてください。' })
      return
    }
    if (document.hidden) return
    const token = ++session.current
    pending.current = true
    setStatus({ phase: 'requesting', message: 'ブラウザのカメラ許可を待っています' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
      if (!alive.current || token !== session.current || document.hidden) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      const video = document.createElement('video')
      video.muted = true
      video.autoplay = true
      video.playsInline = true
      video.srcObject = stream
      const current = { stream, video, texture: null as VideoTexture | null }
      resource.current = current
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (token !== session.current) return
          stop()
          if (alive.current) setStatus({ phase: 'error', message: 'カメラの接続が切れました。接続を確認して再開してください。' })
        }
      })
      await video.play()
      if (!alive.current || token !== session.current || document.hidden) return
      const next = new VideoTexture(video)
      next.colorSpace = SRGBColorSpace
      // Cover the portrait surface without stretching; reverse X like a mirror.
      const aspect = video.videoWidth / Math.max(1, video.videoHeight)
      const surfaceAspect = 0.94 / 1.24
      const cropX = Math.min(1, surfaceAspect / aspect)
      const cropY = Math.min(1, aspect / surfaceAspect)
      next.repeat.set(-cropX, cropY)
      next.offset.set((1 + cropX) / 2, (1 - cropY) / 2)
      current.texture = next
      setTexture(next)
      setStatus({ phase: 'live', message: 'あなたの画面だけに表示中' })
    } catch (error) {
      if (alive.current && token === session.current) {
        release()
        setTexture(null)
        setStatus({ phase: 'error', message: explain(error) })
      }
    } finally { pending.current = false }
  }, [release, stop])

  useEffect(() => {
    alive.current = true
    const hide = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', stop)
    return () => {
      alive.current = false
      session.current++
      release()
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', stop)
    }
  }, [release, stop])

  return { status, texture, start, stop }
}
