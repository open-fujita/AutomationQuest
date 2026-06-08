// ============================================================
// 模擬サイトモデル — ブラウザビューに表示する架空の社内サイト。
// ロボットの抽出 / クリック対象の「要素」を定義する。
// 実サイトには一切アクセスしない。
// ============================================================

/** 単一要素（M1 で抽出する見出しなど）。targetId = element.id */
export interface SiteElement {
  id: string
  /** 画面に表示するラベル（見出し / フィールド名など） */
  label: string
  /** 抽出されるテキスト */
  text: string
  role: 'heading' | 'paragraph' | 'link' | 'button' | 'input'
}

/** テーブルの列定義（抽出可能な列）。targetId = `col:${key}` */
export interface SiteColumn {
  key: string
  label: string
}

/** テーブルの 1 行。cells は列 key → 値 */
export interface SiteRow {
  id: string
  cells: Record<string, string>
}

/** ブラウザビューに表示する模擬サイト */
export interface MockSite {
  id: string
  url: string
  title: string
  /** サイト上部の説明文 */
  intro?: string
  /** 単一要素（M1） */
  singles: SiteElement[]
  /** テーブル（M2 以降）。行コンテナの targetId は 'row' 固定 */
  table?: {
    caption: string
    columns: SiteColumn[]
    rows: SiteRow[]
  }
}

/** ForEach（要素の繰り返し）のターゲット ID（行コンテナを表す固定値） */
export const ROW_TARGET = 'row'

/** 列の targetId を生成 */
export function colTarget(key: string): string {
  return `col:${key}`
}

/** targetId が列を指すか判定し、列 key を返す（列でなければ null） */
export function parseColTarget(targetId: string): string | null {
  return targetId.startsWith('col:') ? targetId.slice(4) : null
}
