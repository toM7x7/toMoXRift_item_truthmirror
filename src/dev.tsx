import { OrbitControls, ContactShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { XRiftContext, useXRift } from '@xrift/world-components'
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Object3D, Raycaster, Vector2 } from 'three'
import { createRoot } from 'react-dom/client'
import { Item, type MirrorHandle } from './Item'
import type { CameraStatus } from './useLocalCamera'
import './style.css'

// Only the interaction registry is needed in this orbit preview. Avoid mounting
// platform input dialogs, shared-state or media providers in the local camera lab.
function LocalPreviewProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const interactableObjects = new Set<Object3D>()
    return { baseUrl: '/', interactableObjects,
      registerInteractable: (object: Object3D) => { interactableObjects.add(object) },
      unregisterInteractable: (object: Object3D) => { interactableObjects.delete(object) } }
  }, [])
  return <XRiftContext.Provider value={value}>{children}</XRiftContext.Provider>
}

function PreviewInteraction() {
  const { gl, camera } = useThree()
  const frames = useRef(0)
  useFrame(() => { if (++frames.current === 8) gl.domElement.dataset.ready = 'true' })
  const { interactableObjects } = useXRift()
  useEffect(() => {
    const canvas = gl.domElement
    const ray = new Raycaster()
    ray.layers.enable(11)
    let down = { x: 0, y: 0 }
    const press = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY } }
    const click = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return
      const rect = canvas.getBoundingClientRect()
      ray.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
      const hit = ray.intersectObjects([...interactableObjects], true)[0]
      let object: Object3D | null = hit?.object ?? null
      while (object) {
        if (object.userData.enabled !== false && typeof object.userData.onInteract === 'function') { object.userData.onInteract(object.userData.id); break }
        object = object.parent
      }
    }
    canvas.addEventListener('pointerdown', press)
    canvas.addEventListener('pointerup', click)
    return () => { canvas.removeEventListener('pointerdown', press); canvas.removeEventListener('pointerup', click) }
  }, [gl, camera, interactableObjects])
  return null
}

function App() {
  const control = useRef<MirrorHandle>(null)
  const [status, setStatus] = useState<CameraStatus>({ phase: 'idle', message: 'カメラは停止しています' })
  const [mounted, setMounted] = useState(true)
  const active = status.phase === 'requesting' || status.phase === 'live'
  return <main>
    <section className="scene" aria-label="真実の鏡 3Dプレビュー">
      <Canvas shadows camera={{ position: [0.2, 1.7, 3.7], fov: 39 }} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={['#151c20']} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={3} />
        <directionalLight position={[-3, 2, 1]} intensity={1} color="#b0dcd6" />
        {mounted && <Item ref={control} onStatus={setStatus} />}
        <PreviewInteraction />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#293235" roughness={0.95} /></mesh>
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={5} blur={2.5} far={3} />
        <OrbitControls target={[0, 1.1, 0]} minDistance={2} maxDistance={6} maxPolarAngle={Math.PI / 2} />
      </Canvas>
      <span className="scene-note">ドラッグで回転 · ホイールで拡大</span>
    </section>
    <aside>
      <p className="eyebrow">XRIFT ITEM / PC PROTOTYPE</p>
      <h1>真実の鏡</h1>
      <p className="lead">鏡を覗くと、<br />そこには本当のあなた。</p>
      <p>PCのWebカメラ映像を、あなたの画面の鏡だけに映します。</p>
      <div className={`status ${status.phase}`} role="status" data-phase={mounted ? status.phase : 'removed'}>{mounted ? status.message : '鏡を取り外しました（カメラ停止）'}</div>
      <button className="primary" disabled={!mounted} onClick={() => { if (active) control.current?.stop(); else void control.current?.start() }}>{active ? 'カメラを停止' : 'カメラを許可して映す'}</button>
      <p className="note">左右反転・縦長に中央を切り出して表示。<br />顔が中央に来るよう、カメラの位置を調整してください。</p>
      <ul><li>映像の共有・録画・保存はしません。</li><li>タブを隠すと自動で停止します。</li><li>再表示しても自動では再開しません。</li></ul>
      <button className="secondary" onClick={() => { if (mounted) { control.current?.stop(); setMounted(false) } else setMounted(true) }}>{mounted ? '鏡を取り外す' : '鏡を置き直す'}</button>
      <p className="footnote">PCのChrome / Edge推奨。これはローカル試作です。XRift上の配置・審査は未確認です。</p>
    </aside>
  </main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><LocalPreviewProvider><App /></LocalPreviewProvider></StrictMode>)
