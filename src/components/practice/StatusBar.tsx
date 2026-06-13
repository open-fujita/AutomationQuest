// ============================================================
// StatusBar — 実機練習編 DS シェル下部ステータスバー
//
// 実機画像（full_BER_real.png）の最下部に表示される:
//   左: 「準備が完了しました。」（初期状態）
//   中央: コンテキスト文字列（パスや補足情報）
//   右端: 赤丸（接続状態インジケータ）
//
// トースト的なメッセージ表示機能（数秒後に初期状態に戻す）も提供。
// ============================================================

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'

export interface StatusBarHandle {
  /** メッセージを指定ミリ秒表示後に元に戻す */
  flash: (msg: string, durationMs?: number) => void
}

interface StatusBarProps {
  /** 中央に表示するコンテキスト文字列（アドレスバーやファイルパス） */
  contextText?: string
}

/**
 * DSシェル最下部のステータスバー。
 * ref で StatusBarHandle を公開し、外部から flash() を呼べる。
 */
const StatusBar = forwardRef<StatusBarHandle, StatusBarProps>(function StatusBar(
  { contextText = '' },
  ref,
) {
  const [message, setMessage] = useState('準備が完了しました。')
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((msg: string, durationMs = 3000) => {
    setMessage(msg)
    if (timerRef) clearTimeout(timerRef)
    const t = setTimeout(() => {
      setMessage('準備が完了しました。')
    }, durationMs)
    setTimerRef(t)
  }, [timerRef])

  // ref を外部に公開
  useImperativeHandle(ref, () => ({ flash }), [flash])

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timerRef) clearTimeout(timerRef)
    }
  }, [timerRef])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="ステータスバー"
      className="flex h-[22px] shrink-0 items-center border-t border-das-border bg-das-panelAlt px-2 text-[11px] text-das-textDim"
    >
      {/* 左: ステータスメッセージ */}
      <span className="shrink-0">{message}</span>

      {/* 中央: コンテキスト文字列 */}
      {contextText && (
        <span className="mx-2 flex-1 truncate text-center text-das-textDim/70">{contextText}</span>
      )}
      {!contextText && <span className="flex-1" />}

      {/* 右端: 赤丸インジケータ（実機準拠の装飾） */}
      <span
        className="ml-1 h-3 w-3 shrink-0 rounded-full bg-red-500"
        aria-hidden="true"
        title="接続状態"
      />
    </div>
  )
})

export default StatusBar
