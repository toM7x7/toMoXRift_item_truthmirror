import { OrbitControls, ContactShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { XRiftContext, useXRift } from '@xrift/world-components'
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Object3D, Raycaster, Vector2 } from 'three'
import { createRoot } from 'react-dom/client'
import { Item, type MirrorHandle, type DisplayMode } from './Item'
import type { CameraStatus } from './useLocalCamera'
import type { FaceStatus } from './useFaceCutout'
import { DEFAULT_ALIGNMENT, type FaceAlignment } from './FaceMirror'
import './style.css'

const initialMode: DisplayMode = new URLSearchParams(window.location.search).get('mode') === 'face' ? 'face' : 'camera'

function FixedView({ active, offset }: { active: boolean; offset: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (active) camera.position.set(offset, 1.61, 1.6)
    else camera.position.set(0.2, 1.7, 3.7)
    camera.lookAt(0, active ? 1.3 : 1.1, 0)
    camera.updateProjectionMatrix()
  }, [active, camera, offset])
  return null
}

// Local stand-in only: the host's real avatar is reflected when placed in XRift.
function PreviewAvatar({ offset }: { offset: number }) {
  const group = useRef<import('three').Group>(null)
  useEffect(() => { group.current?.traverse(object => object.layers.set(10)) }, [])
  return <group ref={group} position={[offset, 0, 1.5]} name="preview-avatar-stand-in">
    <mesh position={[0, 1.61, 0]} scale={[0.115, 0.15, 0.1]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color="#e7b896" roughness={0.8} /></mesh>
    <mesh position={[0, 1.71, 0.015]} scale={[0.123, 0.1, 0.106]}><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#262332" /></mesh>
    {[-0.039, 0.039].map(x => <mesh key={x} position={[x, 1.63, -0.094]}><sphereGeometry args={[0.012, 12, 12]} /><meshStandardMaterial color="#30242b" /></mesh>)}
    <mesh position={[0, 1.54, -0.092]} scale={[0.03, 0.007, 0.006]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#975950" /></mesh>
    <mesh position={[0, 1.17, 0]}><capsuleGeometry args={[0.19, 0.37, 8, 16]} /><meshStandardMaterial color="#426d93" /></mesh>
    {[-0.24, 0.24].map(x => <mesh key={x} position={[x, 1.12, 0]}><capsuleGeometry args={[0.065, 0.45, 8, 12]} /><meshStandardMaterial color="#426d93" /></mesh>)}
    {[-0.1, 0.1].map(x => <mesh key={x} position={[x, 0.43, 0]}><capsuleGeometry args={[0.075, 0.6, 8, 12]} /><meshStandardMaterial color="#3d414d" /></mesh>)}
  </group>
}

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialMode)
  const [faceStatus, setFaceStatus] = useState<FaceStatus>({ phase: 'off', message: 'カメラを開始すると顔を検知します' })
  const [alignment, setAlignment] = useState<FaceAlignment>(DEFAULT_ALIGNMENT)
  const [offset, setOffset] = useState(0)
  const active = status.phase === 'requesting' || status.phase === 'live'
  return <main>
    <section className="scene" aria-label="真実の鏡 3Dプレビュー">
      <Canvas shadows camera={{ position: [0.2, 1.7, 3.7], fov: displayMode === 'face' ? 68 : 39 }} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={['#151c20']} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={3} />
        <directionalLight position={[-3, 2, 1]} intensity={1} color="#b0dcd6" />
        {mounted && <Item ref={control} onStatus={setStatus} initialDisplayMode={displayMode} onDisplayMode={setDisplayMode} onFaceStatus={setFaceStatus} onAlignment={setAlignment} />}
        <FixedView active={displayMode === 'face'} offset={offset} />
        {displayMode === 'face' && <PreviewAvatar offset={offset} />}
        <PreviewInteraction />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#293235" roughness={0.95} /></mesh>
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={5} blur={2.5} far={3} />
        {displayMode === 'camera' && <OrbitControls target={[0, 1.1, 0]} minDistance={2} maxDistance={6} maxPolarAngle={Math.PI / 2} />}
      </Canvas>
      <span className="scene-note">{displayMode === 'face' ? '正面・固定視点 / 検証用アバター（XRift内では本人のアバターを反射）' : 'ドラッグで回転 · ホイールで拡大'}</span>
    </section>
    <aside>
      <p className="eyebrow">XRIFT ITEM / PC PROTOTYPE</p>
      <h1>真実の鏡</h1>
      <div className="mode-buttons"><button onClick={() => control.current?.setDisplayMode('camera')} aria-pressed={displayMode === 'camera'}>全面カメラ</button><button onClick={() => control.current?.setDisplayMode('face')} aria-pressed={displayMode === 'face'}>顔はめ試作</button></div>
      <p className="lead">鏡を覗くと、<br />そこには本当のあなた。</p>
      <p>{displayMode === 'face' ? '髪と体はアバターのまま、鏡の中の顔だけに実写を重ねます。' : 'PCのWebカメラ映像を、あなたの画面の鏡だけに映します。'}</p>
      <div className={`status ${status.phase}`} role="status" data-phase={mounted ? status.phase : 'removed'}>{mounted ? status.message : '鏡を取り外しました（カメラ停止）'}</div>
      <button className="primary" disabled={!mounted} onClick={() => { if (active) control.current?.stop(); else void control.current?.start() }}>{active ? 'カメラを停止' : 'カメラを許可して映す'}</button>
      {displayMode === 'face' && <section className="alignment" aria-label="顔はめ調整">
        <div role="status" data-face-phase={mounted ? faceStatus.phase : 'off'}>{mounted ? faceStatus.message : '鏡を取り外しました（顔検知停止）'}</div>
        <p>カメラを正面から見て、反射した顔に合うよう調整してください。自動追従はしません。</p>
        <label>左右 <input aria-label="顔の左右位置" type="range" min="-0.3" max="0.3" step="0.005" value={alignment.x} onChange={e => control.current?.setAlignment({ x: Number(e.target.value) })} /></label>
        <label>上下 <input aria-label="顔の上下位置" type="range" min="0.95" max="1.8" step="0.005" value={alignment.y} onChange={e => control.current?.setAlignment({ y: Number(e.target.value) })} /></label>
        <label>大きさ <input aria-label="顔の大きさ" type="range" min="0.06" max="0.32" step="0.005" value={alignment.width} onChange={e => control.current?.setAlignment({ width: Number(e.target.value) })} /></label>
        <label className="guide"><input type="checkbox" onChange={e => control.current?.setGuide(e.target.checked)} />位置合わせの枠を表示</label>
        <button className="secondary" onClick={() => control.current?.setAlignment(DEFAULT_ALIGNMENT)}>顔位置をリセット</button>
        <button className="secondary" onClick={() => setOffset(x => x === 0 ? 0.5 : 0)}>{offset === 0 ? '一歩横へ移動して確認' : '正面の立ち位置に戻る'}</button>
      </section>}
      <p className="note">{displayMode === 'face' ? '顔の輪郭を切り抜いて左右反転します。位置合わせ後は、立ち位置と視線を固定してください。' : <>左右反転・縦長に中央を切り出して表示。<br />顔が中央に来るよう、カメラの位置を調整してください。</>}</p>
      <ul><li>映像の共有・録画・保存はしません。</li><li>タブを隠すと自動で停止します。</li><li>再表示しても自動では再開しません。</li></ul>
      <button className="secondary" onClick={() => { if (mounted) { control.current?.stop(); setMounted(false) } else setMounted(true) }}>{mounted ? '鏡を取り外す' : '鏡を置き直す'}</button>
      <p className="footnote">PCのChrome / Edge推奨。顔はめはローカル試作です。自由移動への追従・XRift内での顔位置合わせは未検証です。</p>
    </aside>
  </main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><LocalPreviewProvider><App /></LocalPreviewProvider></StrictMode>)
