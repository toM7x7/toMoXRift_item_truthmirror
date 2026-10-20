import { Mirror } from '@xrift/world-components'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, Mesh, Vector3, type Texture } from 'three'

export interface FaceAlignment { x: number; y: number; width: number }
export const DEFAULT_ALIGNMENT: FaceAlignment = { x: 0, y: 1.61, width: 0.115 }
export function constrainAlignment(value: FaceAlignment): FaceAlignment {
  const width = Math.max(0.06, Math.min(0.32, value.width))
  const halfHeight = width * 1.25 / 2
  return { width, x: Math.max(-0.46 + width / 2, Math.min(0.46 - width / 2, value.x)), y: Math.max(0.72 + halfHeight, Math.min(1.94 - halfHeight, value.y)) }
}

export function FaceMirror({ texture, visible, alignment, guide, onStanceChange }: { texture: Texture; visible: boolean; alignment: FaceAlignment; guide: boolean; onStanceChange: (inPlace: boolean) => void }) {
  const { x, y, width } = alignment
  const root = useRef<Group>(null)
  const overlay = useRef<Mesh>(null)
  const previousStance = useRef<boolean | null>(null)
  const scratch = useMemo(() => ({ position: new Vector3(), forward: new Vector3(), target: new Vector3() }), [])
  useFrame(({ camera }) => {
    if (!root.current || !overlay.current) return
    camera.getWorldPosition(scratch.position)
    camera.getWorldDirection(scratch.forward)
    scratch.target.copy(scratch.position).add(scratch.forward)
    root.current.worldToLocal(scratch.position)
    root.current.worldToLocal(scratch.target)
    scratch.forward.copy(scratch.target).sub(scratch.position).normalize()
    const inPlace = Math.abs(scratch.position.x) <= 0.2 && Math.abs(scratch.position.z - 1.6) <= 0.25 && scratch.forward.z < -0.94
    overlay.current.visible = visible && inPlace
    if (inPlace !== previousStance.current) { previousStance.current = inPlace; onStanceChange(inPlace) }
  })
  return <group ref={root}>
    <Mirror position={[0, 1.33, 0.099]} size={[0.94, 1.24]} color={0xffffff} textureResolution={1024} />
    {/* A local transparent layer on this mirror, without editing any avatar. */}
    <mesh ref={overlay} name="truth-face-overlay" visible={false} position={[x, y, 0.108]} renderOrder={5}>
      <planeGeometry args={[width, width * 1.25]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
    {guide && <mesh position={[x, y, 0.11]}>
      <planeGeometry args={[width, width * 1.25]} />
      <meshBasicMaterial color="#5fffc5" wireframe transparent opacity={0.8} depthWrite={false} />
    </mesh>}
  </group>
}
