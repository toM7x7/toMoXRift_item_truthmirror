import { RoundedBox } from '@react-three/drei'
import { Interactable, usePlacementState } from '@xrift/world-components'
import { useEffect, useId, useImperativeHandle, useMemo, type Ref } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useLocalCamera, type CameraStatus } from './useLocalCamera'

export interface MirrorHandle { start: () => Promise<void>; stop: () => void }
export interface ItemProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  ref?: Ref<MirrorHandle>
  onStatus?: (status: CameraStatus) => void
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

export function Item({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, ref, onStatus }: ItemProps) {
  const camera = useLocalCamera()
  const { mode } = usePlacementState()
  const id = useId()
  const active = camera.status.phase === 'live' || camera.status.phase === 'requesting'
  useImperativeHandle(ref, () => ({ start: camera.start, stop: camera.stop }), [camera.start, camera.stop])
  useEffect(() => { onStatus?.(camera.status) }, [onStatus, camera.status])
  useEffect(() => { if (mode === 'preview') camera.stop() }, [mode, camera.stop])
  const buttonText = camera.status.phase === 'live' ? 'カメラを止める' : camera.status.phase === 'requesting' ? '開始を取り消す' : '真実を見る'
  return <group position={position} rotation={rotation} scale={scale} name="truth-mirror">
    <RoundedBox args={[1.16, 1.65, 0.11]} radius={0.07} position={[0, 1.28, 0]}><meshStandardMaterial color="#a88545" metalness={0.78} roughness={0.3} /></RoundedBox>
    <RoundedBox args={[1.07, 1.56, 0.055]} radius={0.045} position={[0, 1.28, 0.065]}><meshStandardMaterial color="#211d1b" metalness={0.4} roughness={0.5} /></RoundedBox>
    <mesh position={[0, 1.33, 0.099]}><planeGeometry args={[0.94, 1.24]} />
      <meshBasicMaterial key={camera.texture ? 'live' : 'idle'} map={camera.texture} color={camera.texture ? '#ffffff' : '#121e24'} toneMapped={false} />
    </mesh>
    {!camera.texture && <>
      <Label text="TRUTH" position={[0, 1.51, 0.103]} width={0.68} height={0.09} />
      <Label text={camera.status.phase === 'error' ? 'カメラ設定を確認してください' : camera.status.phase === 'requesting' ? 'カメラ許可待ち' : 'ここに、本当のあなた。'} position={[0, 1.29, 0.103]} width={0.81} height={0.085} color="#acbdc3" />
      <Label text="映像はあなたの画面だけに" position={[0, 1.12, 0.103]} width={0.75} height={0.075} color="#778e99" />
    </>}
    <Label text="真実の鏡" position={[0, 2.005, 0.103]} width={0.61} height={0.085} />
    <Interactable id={`truth-mirror-${id}-toggle`} enabled={mode !== 'preview'} interactionText={buttonText} onInteract={() => { if (active) camera.stop(); else void camera.start() }}>
      <RoundedBox args={[0.71, 0.14, 0.055]} radius={0.025} position={[0, 0.61, 0.11]}><meshStandardMaterial color={active ? '#703c33' : '#31514b'} roughness={0.5} /></RoundedBox>
      <Label text={buttonText} position={[0, 0.61, 0.14]} width={0.63} height={0.075} />
    </Interactable>
    <mesh position={[0.43, 0.61, 0.112]}><sphereGeometry args={[0.018, 16, 16]} /><meshBasicMaterial color={camera.texture ? '#7ee7b5' : '#6d6256'} /></mesh>
    {[-0.43, 0.43].map(x => <group key={x}>
      <mesh position={[x, 0.27, 0]}><cylinderGeometry args={[0.022, 0.03, 0.54, 12]} /><meshStandardMaterial color="#9a773d" metalness={0.8} roughness={0.35} /></mesh>
      <RoundedBox position={[x, 0.035, 0]} args={[0.17, 0.07, 0.52]} radius={0.025}><meshStandardMaterial color="#211d1b" metalness={0.5} roughness={0.5} /></RoundedBox>
    </group>)}
  </group>
}
