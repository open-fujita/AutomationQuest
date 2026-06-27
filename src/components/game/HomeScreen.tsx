import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import HealthRulesPanel from './HealthRulesPanel'
import OfficeMapHome from './OfficeMapHome'
import { LOGO } from './mascot'

export default function HomeScreen() {
  const profile = useGameStore((s) => s.profile)
  const profiles = useGameStore((s) => s.profiles)
  const loginProfile = useGameStore((s) => s.loginProfile)
  const deleteProfile = useGameStore((s) => s.deleteProfile)

  const [newName, setNewName] = useState('')
  const [showHealthRules, setShowHealthRules] = useState(false)

  // プロフィール選択済み → すごろくMAP（アイソメ・オフィス）ホーム
  if (profile) return <OfficeMapHome />

  // 未選択 → プレイヤー選択（TOP / ログイン）。すごろくMAP と同じ明テーマ。
  const font = "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#F1EADD', color: '#1A1A1A', fontFamily: font }}>
      {/* ヘッダ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E6E5E1' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={LOGO} alt="OPEN" style={{ height: 28, width: 'auto' }} />
            <div style={{ height: 24, width: 1, background: '#E0DED9' }} />
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.02em' }}>自動化推進室クエスト</div>
          </div>
          <div
            onClick={() => setShowHealthRules(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #F0C79A', color: '#CC8C4B', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 999, cursor: 'pointer' }}
          >
            🩺 健康なロボットのための10か条
          </div>
        </div>
      </div>

      {/* ヒーロー */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.02em' }}>自動化推進室クエスト</div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#6B6B6B', lineHeight: 1.7 }}>
          BizRobo! Design Studio 研修ラボ。<br />各部署の相談を、ロボットで解決していこう。
        </div>
      </div>

      {/* プレイヤー選択カード */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 60px' }}>
        <div style={{ background: '#fff', border: '1px solid #ECEBE7', borderRadius: 18, boxShadow: '0 16px 40px rgba(26,26,26,.08)', padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>プレイヤーを選択</div>
          <p style={{ fontSize: 12, color: '#9A9A9A', margin: '0 0 16px', lineHeight: 1.7 }}>
            進捗は名前ごとに保存されます。複数の人が同じ環境でも、それぞれの続きから再開できます。
          </p>

          {profiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {profiles.map((name) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    onClick={() => loginProfile(name)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAF8', border: '1px solid #ECEBE7', borderRadius: 12, padding: '11px 14px', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#F6A35A,#ED6A82)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {name.charAt(0)}
                    </span>
                    {name}
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#CC8C4B', fontWeight: 700 }}>はじめる ▶</span>
                  </div>
                  <div
                    onClick={() => {
                      if (confirm(`「${name}」の進捗を削除しますか？`)) deleteProfile(name)
                    }}
                    title="このプレイヤーを削除"
                    style={{ padding: '8px 10px', fontSize: 14, color: '#B7B6B1', cursor: 'pointer' }}
                  >
                    🗑
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) loginProfile(newName)
              }}
              placeholder="新しい名前を入力"
              style={{ flex: 1, border: '1px solid #E6E5E1', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, outline: 'none', fontFamily: font }}
            />
            <button
              onClick={() => loginProfile(newName)}
              disabled={!newName.trim()}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
                color: '#fff',
                background: newName.trim() ? 'linear-gradient(100deg,#F6A35A,#ED6A82)' : '#D9D6D0',
                boxShadow: newName.trim() ? '0 8px 20px rgba(237,106,130,.24)' : 'none',
              }}
            >
              はじめる
            </button>
          </div>
        </div>
      </div>

      {/* 10か条モーダル */}
      {showHealthRules && <HealthRulesPanel onClose={() => setShowHealthRules(false)} />}
    </div>
  )
}
