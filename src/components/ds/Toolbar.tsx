import { useState } from 'react'

interface ToolbarProps {
  onRun: () => void
  onHome: () => void
  onOpenGlossary: () => void
  onOpenProgress: () => void
  onOpenHealthRules: () => void
}

export default function Toolbar({ onRun, onHome, onOpenGlossary, onOpenProgress, onOpenHealthRules }: ToolbarProps) {
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-das-border bg-das-panelAlt px-3 py-1.5">
      <button
        onClick={onRun}
        className="flex items-center gap-1.5 rounded bg-das-ok px-3 py-1 text-[13px] font-bold text-white shadow hover:brightness-110"
      >
        ▶ 実行
      </button>
      <button
        onClick={onRun}
        title="ステップ実行（このスライドではまとめて実行）"
        className="rounded border border-das-border bg-das-bg px-2.5 py-1 text-[12px] text-das-text hover:border-das-accent2"
      >
        🐞 デバッグ
      </button>
      <button
        onClick={save}
        className="rounded border border-das-border bg-das-bg px-2.5 py-1 text-[12px] text-das-text hover:border-das-accent2"
      >
        💾 {saved ? '保存しました' : '保存'}
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onHome} className="rounded px-2 py-1 text-[12px] text-das-textDim hover:text-das-text">
          🏠 ホーム
        </button>
        <button onClick={onOpenProgress} className="rounded px-2 py-1 text-[12px] text-das-textDim hover:text-das-text">
          🗺 進捗
        </button>
        <button onClick={onOpenGlossary} className="rounded px-2 py-1 text-[12px] text-das-textDim hover:text-das-text">
          📖 用語集
        </button>
        <button onClick={onOpenHealthRules} className="rounded px-2 py-1 text-[12px] text-das-textDim hover:text-das-text">
          🩺 10か条
        </button>
      </div>
    </div>
  )
}
