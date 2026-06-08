import { useRobotStore } from '../../store/robotStore'
import type { StepActionType } from '../../model/robot'
import { ACTION_LABELS } from '../../model/robot'

const PALETTE: { type: StepActionType; icon: string; note: string }[] = [
  { type: 'LoadPage', icon: '🌐', note: 'ページを開く' },
  { type: 'ExtractText', icon: '🔎', note: 'テキストを取り込む' },
  { type: 'ExtractURL', icon: '🔗', note: 'リンク URL を取り込む' },
  { type: 'ForEach', icon: '↻', note: '一覧を繰り返す' },
  { type: 'TestValue', icon: '◇', note: '条件で分ける' },
  { type: 'Click', icon: '👆', note: 'ボタンを押す' },
  { type: 'EnterText', icon: '⌨', note: '文字を入力' },
  { type: 'ReturnValue', icon: '📤', note: '出力変数を返す' },
]

export default function Palette() {
  const addAction = useRobotStore((s) => s.addAction)

  return (
    <div className="border-t border-ds-border">
      <div className="border-b border-ds-border bg-ds-panelAlt px-3 py-1.5 text-[12px] font-semibold text-ds-text">
        パレット
      </div>
      <div className="space-y-1 p-2">
        <div className="px-1 pb-1 text-[10px] text-ds-textDim">クリックで終了ステップの前に挿入</div>
        {PALETTE.map((p) => (
          <button
            key={p.type}
            onClick={() => addAction(p.type)}
            className="flex w-full items-center gap-2 rounded border border-ds-border bg-ds-bg/40 px-2 py-1.5 text-left hover:border-ds-accent2 hover:bg-ds-accent2/10"
          >
            <span className="text-[14px]">{p.icon}</span>
            <span className="flex-1">
              <span className="block text-[12px] text-ds-text">{ACTION_LABELS[p.type]}</span>
              <span className="block text-[10px] text-ds-textDim">{p.note}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
