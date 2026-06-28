// ============================================================
// TypeEditorTab — 実機練習編 DS シェルの info.type タブコンテンツ
//
// info.type ファイルの属性定義一覧を表示（読み取り中心）。
// DifyConnector の入出力型（query / response / conversation_id / status）を表示する。
//
// 実機の型エディタに相当する見た目（表形式・属性名/型/説明）。
// ============================================================

import { INFO_TYPE_ATTRIBUTES } from '../../data/practice'

export default function TypeEditorTab() {
  return (
    <div
      className="flex h-full flex-col overflow-auto bg-das-bg p-4"
      role="region"
      aria-label="info.type 型定義エディタ"
    >
      {/* ヘッダ */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[20px]" aria-hidden="true">📄</span>
        <div>
          <div className="text-[14px] font-semibold text-das-text">info.type</div>
          <div className="text-[11px] text-das-textDim">
            DifyConnector の入出力型定義（属性一覧）
          </div>
        </div>
      </div>

      {/* 属性テーブル */}
      <div className="overflow-x-auto rounded border border-das-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-das-border bg-das-panelAlt text-left text-[11px] text-das-textDim">
              <th className="px-3 py-2 font-semibold">属性名</th>
              <th className="px-3 py-2 font-semibold">型</th>
              <th className="px-3 py-2 font-semibold">説明</th>
            </tr>
          </thead>
          <tbody>
            {INFO_TYPE_ATTRIBUTES.map((attr, i) => (
              <tr
                key={attr.name}
                className={[
                  'border-b border-das-border/60',
                  i % 2 === 0 ? 'bg-das-bg' : 'bg-das-panelAlt/30',
                  'hover:bg-das-accent2/5',
                ].join(' ')}
              >
                <td className="px-3 py-2 font-mono text-das-accent2">{attr.name}</td>
                <td className="px-3 py-2 text-das-textDim">{attr.typeName}</td>
                <td className="px-3 py-2 text-das-textDim">{attr.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* フッタ注記 */}
      <div className="mt-3 text-[11px] text-das-textDim/70">
        ※ この型は DifyConnector connector で使用されます。main_1.robot の「ロボットを呼び出す」ステップが sub.robot を呼び出す際に、この型の変数を経由してデータを受け渡します。
      </div>
    </div>
  )
}
