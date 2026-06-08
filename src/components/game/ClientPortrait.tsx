import { useState } from 'react'

interface Props {
  name: string
  dept: string
  portrait?: string
  size?: number
}

/** 依頼者ポートレート。画像が無い場合は頭文字アバターにフォールバック（build を壊さない）。 */
export default function ClientPortrait({ name, dept, portrait, size = 56 }: Props) {
  const [failed, setFailed] = useState(false)
  const initial = dept.slice(0, 1)
  const px = `${size}px`

  if (portrait && !failed) {
    return (
      <img
        src={portrait}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: px, height: px }}
        className="rounded-full border-2 border-ds-accent/60 object-cover"
      />
    )
  }
  return (
    <div
      style={{ width: px, height: px }}
      className="flex items-center justify-center rounded-full border-2 border-ds-accent/60 bg-ds-panelAlt text-[18px] font-bold text-ds-accent"
    >
      {initial}
    </div>
  )
}
