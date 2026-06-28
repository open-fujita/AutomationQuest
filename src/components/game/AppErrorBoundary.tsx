// ============================================================
// AppErrorBoundary — アプリ最上位の Error Boundary
//
// 白画面（未捕捉例外でツリーが落ちる）の恒久対策。
// class component でなければ Error Boundary は実装できないため、クラスコンポーネントで実装する。
//
// フォールバック UI:
//   - 「エラーが発生しました」見出し
//   - error.message
//   - stack の先頭 5 行（等幅フォント）
//   - 「ホームへ戻る」ボタン（gameStore.goHome を呼んで状態リセット + this.setState で復帰）
//   - 「再読み込み」ボタン（window.location.reload）
//
// アクセシビリティ: role="alert" + aria-live="assertive" で支援技術に通知する。
// ============================================================

import React from 'react'
import { useGameStore } from '../../store/gameStore'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// ---- ホームへ戻るボタン（関数コンポーネントラッパー）-----------
// class コンポーネントから zustand フックを直接呼べないため、
// ラッパー関数コンポーネントを通じて goHome を取得する。

function GoHomeButton({ onGoHome }: { onGoHome: () => void }) {
  const goHome = useGameStore((s) => s.goHome)
  return (
    <button
      type="button"
      onClick={() => {
        goHome()
        onGoHome()
      }}
      className="rounded bg-blue-600 px-4 py-2 text-[13px] text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      ホームへ戻る
    </button>
  )
}

// ---- AppErrorBoundary ----------------------------------------

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 本番では外部のエラー監視サービスに送ることも可能
    console.error('[AppErrorBoundary] 未捕捉エラーを補足しました:', error)
    console.error('[AppErrorBoundary] コンポーネントスタック:', info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const error = this.state.error
    // stack の先頭 5 行を表示（情報量を適度に抑える）
    const stackLines = (error?.stack ?? '')
      .split('\n')
      .slice(0, 6)
      .join('\n')

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-screen items-center justify-center bg-gray-50 p-8"
      >
        <div className="w-full max-w-xl rounded-xl border border-red-200 bg-white p-8 shadow-lg">
          {/* 見出し */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[32px]" aria-hidden="true">⚠️</span>
            <h1 className="text-[18px] font-bold text-gray-800">
              エラーが発生しました
            </h1>
          </div>

          {/* エラーメッセージ */}
          {error?.message && (
            <p className="mb-4 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              {error.message}
            </p>
          )}

          {/* スタックトレース（先頭 5 行） */}
          {stackLines && (
            <details className="mb-6">
              <summary className="cursor-pointer select-none text-[12px] text-gray-500 hover:text-gray-700">
                詳細を表示
              </summary>
              <pre className="mt-2 overflow-x-auto rounded border border-gray-200 bg-gray-100 p-3 text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap break-all">
                {stackLines}
              </pre>
            </details>
          )}

          {/* アクション */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ホームへ戻る: zustand の goHome を呼んで state をリセット */}
            <GoHomeButton onGoHome={this.handleReset} />

            {/* 再読み込み */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              再読み込み
            </button>
          </div>

          {/* 補足メッセージ */}
          <p className="mt-4 text-[11px] text-gray-400">
            問題が繰り返す場合は、ブラウザの開発者ツール（F12）でコンソールのエラーをご確認ください。
          </p>
        </div>
      </div>
    )
  }
}

export default AppErrorBoundary
