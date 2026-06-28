import { GLOSSARY } from '../../data/glossary'
import { useGameStore } from '../../store/gameStore'
import Modal from './Modal'

export default function Glossary({ onClose }: { onClose: () => void }) {
  const unlocked = useGameStore((s) => s.unlockedTerms)
  const entries = Object.values(GLOSSARY)
  const unlockedSet = new Set(unlocked)
  const openEntries = entries.filter((e) => unlockedSet.has(e.key))
  const lockedCount = entries.length - openEntries.length

  return (
    <Modal title={`BizRobo! 用語集（${openEntries.length}/${entries.length} 解禁）`} onClose={onClose}>
      <p style={{ color: '#6B6B6B', fontSize: 12, margin: '0 0 14px' }}>
        相談を解決するたびに、出会った用語がここに記録されていきます。
      </p>

      {openEntries.length === 0 ? (
        // 解禁ゼロ時: 「???」を大量に並べず、案内＋件数だけ表示
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 36 }}>📖</div>
          <div style={{ marginTop: 12, fontSize: 13.5, color: '#6B6B6B', lineHeight: 1.85 }}>
            まだ解禁された用語はありません。
            <br />
            相談を解決すると、出会った用語がここに増えていきます。
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'inline-block',
              background: '#FAFAF8',
              border: '1px solid #ECEBE7',
              borderRadius: 999,
              padding: '7px 16px',
              fontSize: 12,
              color: '#9A9A9A',
            }}
          >
            🔒 全 {entries.length} 語が解禁待ち
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {openEntries.map((e) => (
              <div key={e.key} style={{ borderRadius: 12, border: '1px solid #ECEBE7', background: '#FAFAF8', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{e.term}</span>
                  {e.en && <span style={{ fontSize: 10, color: '#9A9A9A' }}>{e.en}</span>}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#6B6B6B', lineHeight: 1.6 }}>{e.desc}</div>
              </div>
            ))}
          </div>
          {lockedCount > 0 && (
            <div
              style={{
                marginTop: 14,
                textAlign: 'center',
                fontSize: 12,
                color: '#9A9A9A',
                background: '#FAFAF8',
                border: '1px dashed #E0DED9',
                borderRadius: 12,
                padding: 10,
              }}
            >
              🔒 未解禁 {lockedCount} 語 — 相談を進めると、ここに増えていきます
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
