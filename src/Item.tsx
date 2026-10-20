import { RoundedBox } from '@react-three/drei'
import { Interactable, usePlacementState } from '@xrift/world-components'
import { useEffect, useId, useImperativeHandle, useMemo, useState, type Ref } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useLocalCamera, type CameraStatus } from './useLocalCamera'
import { useFaceCutout, type FaceStatus } from './useFaceCutout'
import { FaceMirror, DEFAULT_ALIGNMENT, constrainAlignment, type FaceAlignment } from './FaceMirror'

export type DisplayMode = 'camera' | 'face'
export interface MirrorHandle {
  start: () => Promise<void>; stop: () => void
  setDisplayMode: (mode: DisplayMode) => void
  setAlignment: (value: Partial<FaceAlignment>) => void
  setGuide: (value: boolean) => void
}
export interface ItemProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  ref?: Ref<MirrorHandle>
  onStatus?: (status: CameraStatus) => void
  initialDisplayMode?: DisplayMode
  onFaceStatus?: (status: FaceStatus) => void
  onDisplayMode?: (mode: DisplayMode) => void
  onAlignment?: (alignment: FaceAlignment) => void
}

function Label({ text, position, width, height, color = '#e2c99a' }: {
  text: string; position: [number, number, number]; width: number; height: number; color?: string
}) {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '600 54px "Yu Gothic UI", Meiryo, sans-serif'
    ctx.fillText(text, 512, 64, 990)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [text, color])
  useEffect(() => () => map.dispose(), [map])
  return <mesh position={position}><planeGeometry args={[width, height]} /><meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} /></mesh>
}

export function Item({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, ref, onStatus, initialDisplayMode = 'camera', onFaceStatus, onDisplayMode, onAlignment }: ItemProps) {
  const camera = useLocalCamera()
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode)
  const [alignment, setAlignment] = useState<FaceAlignment>(DEFAULT_ALIGNMENT)
  const [guide, setGuide] = useState(false)
  const [inPlace, setInPlace] = useState(false)
  const face = useFaceCutout(camera.texture?.image as HTMLVideoElement | null, displayMode === 'face')
  const faceDisplayStatus: FaceStatus = face.status.phase === 'found' && !inPlace ? { phase: 'position', message: '足元の目印に立ち、鏡を正面から見てください' } : face.status
  const { mode } = usePlacementState()
  const id = useId()
  const active = camera.status.phase === 'live' || camera.status.phase === 'requesting'
  useImperativeHandle(ref, () => ({ start: camera.start, stop: camera.stop, setDisplayMode, setGuide,
    setAlignment: value => setAlignment(previous => constrainAlignment({ ...previous, ...value })),
  }), [camera.start, camera.stop])
  useEffect(() => { onStatus?.(camera.status) }, [onStatus, camera.status])
  useEffect(() => { onFaceStatus?.(faceDisplayStatus) }, [onFaceStatus, face.status, inPlace])
  useEffect(() => { onDisplayMode?.(displayMode) }, [onDisplayMode, displayMode])
  useEffect(() => { onAlignment?.(alignment) }, [onAlignment, alignment])
  useEffect(() => { if (mode === 'preview') camera.stop() }, [mode, camera.stop])
  const buttonText = camera.status.phase === 'live' ? 'カメラを止める' : camera.status.phase === 'requesting' ? '開始を取り消す' : '真実を見る'
  return <group position={position} rotation={rotation} scale={scale} name="truth-mirror">
    <RoundedBox args={[1.16, 1.65, 0.11]} radius={0.07} position={[0, 1.28, 0]}><meshStandardMaterial color="#a88545" metalness={0.78} roughness={0.3} /></RoundedBox>
    <RoundedBox args={[1.07, 1.56, 0.055]} radius={0.045} position={[0, 1.28, 0.065]}><meshStandardMaterial color="#211d1b" metalness={0.4} roughness={0.5} /></RoundedBox>
    {displayMode === 'face' ? <FaceMirror texture={face.texture} visible={camera.status.phase === 'live' && face.status.phase === 'found'} alignment={alignment} guide={guide} onStanceChange={setInPlace} /> : <mesh position={[0, 1.33, 0.099]}><planeGeometry args={[0.94, 1.24]} />
      <meshBasicMaterial key={camera.texture ? 'live' : 'idle'} map={camera.texture} color={camera.texture ? '#ffffff' : '#121e24'} toneMapped={false} />
    </mesh>}
    {!camera.texture && displayMode === 'camera' && <>
      <Label text="TRUTH" position={[0, 1.51, 0.103]} width={0.68} height={0.09} />
      <Label text={camera.status.phase === 'error' ? 'カメラ設定を確認してください' : camera.status.phase === 'requesting' ? 'カメラ許可待ち' : 'ここに、本当のあなた。'} position={[0, 1.29, 0.103]} width={0.81} height={0.085} color="#acbdc3" />
      <Label text="映像はあなたの画面だけに" position={[0, 1.12, 0.103]} width={0.75} height={0.075} color="#778e99" />
    </>}
    <Label text="真実の鏡" position={[0, 2.005, 0.103]} width={0.61} height={0.085} />
    <Interactable id={`truth-mirror-${id}-toggle`} enabled={mode !== 'preview'} interactionText={buttonText} onInteract={() => { if (active) camera.stop(); else void camera.start() }}>
      <RoundedBox args={[0.71, 0.14, 0.055]} radius={0.025} position={[0, 0.61, 0.11]}><meshStandardMaterial color={active ? '#703c33' : '#31514b'} roughness={0.5} /></RoundedBox>
      <Label text={buttonText} position={[0, 0.61, 0.14]} width={0.63} height={0.075} />
    </Interactable>
    <Interactable id={`truth-mirror-${id}-mode`} enabled={mode !== 'preview'} interactionText={displayMode === 'camera' ? '顔はめに切り替える' : 'Webカメラ全面表示に戻す'} onInteract={() => setDisplayMode(displayMode === 'camera' ? 'face' : 'camera')}>
      <RoundedBox args={[0.64, 0.1, 0.045]} radius={0.018} position={[0, 0.39, 0.11]}><meshStandardMaterial color="#313e47" /></RoundedBox>
      <Label text={displayMode === 'camera' ? '顔はめに切替' : '全面映像に戻す'} position={[0, 0.39, 0.14]} width={0.57} height={0.06} />
    </Interactable>
    {displayMode === 'face' && <>
      <Label text={faceDisplayStatus.message} position={[0, 0.76, 0.118]} width={0.84} height={0.055} color="#92dac4" />
      <Label text="正面の足元マークに立ち、顔位置を調整" position={[0, 0.29, 0.14]} width={0.95} height={0.055} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 1.6]}><ringGeometry args={[0.18, 0.2, 48]} /><meshBasicMaterial color="#74c8ae" /></mesh>
      {[
        { text: '←', x: -0.24, y: 0.18, action: () => setAlignment(a => constrainAlignment({ ...a, x: a.x - 0.01 })) },
        { text: '→', x: -0.08, y: 0.18, action: () => setAlignment(a => constrainAlignment({ ...a, x: a.x + 0.01 })) },
        { text: '↑', x: 0.08, y: 0.18, action: () => setAlignment(a => constrainAlignment({ ...a, y: a.y + 0.01 })) },
        { text: '↓', x: 0.24, y: 0.18, action: () => setAlignment(a => constrainAlignment({ ...a, y: a.y - 0.01 })) },
        { text: '小', x: -0.24, y: 0.06, action: () => setAlignment(a => constrainAlignment({ ...a, width: a.width - 0.01 })) },
        { text: '大', x: -0.08, y: 0.06, action: () => setAlignment(a => constrainAlignment({ ...a, width: a.width + 0.01 })) },
        { text: '枠', x: 0.08, y: 0.06, action: () => setGuide(g => !g) },
        { text: '戻', x: 0.24, y: 0.06, action: () => setAlignment(DEFAULT_ALIGNMENT) },
      ].map((button, index) => <Interactable key={index} id={`truth-mirror-${id}-align-${index}`} enabled={mode !== 'preview'} interactionText={`顔位置調整 ${button.text}`} onInteract={button.action}>
        <RoundedBox args={[0.14, 0.095, 0.04]} radius={0.01} position={[button.x, button.y, 0.29]}><meshStandardMaterial color="#31514b" /></RoundedBox>
        <Label text={button.text} position={[button.x, button.y, 0.315]} width={0.09} height={0.07} />
      </Interactable>)}
    </>}
    <mesh position={[0.43, 0.61, 0.112]}><sphereGeometry args={[0.018, 16, 16]} /><meshBasicMaterial color={camera.texture ? '#7ee7b5' : '#6d6256'} /></mesh>
    {[-0.43, 0.43].map(x => <group key={x}>
      <mesh position={[x, 0.27, 0]}><cylinderGeometry args={[0.022, 0.03, 0.54, 12]} /><meshStandardMaterial color="#9a773d" metalness={0.8} roughness={0.35} /></mesh>
      <RoundedBox position={[x, 0.035, 0]} args={[0.17, 0.07, 0.52]} radius={0.025}><meshStandardMaterial color="#211d1b" metalness={0.5} roughness={0.5} /></RoundedBox>
    </group>)}
  </group>
}
