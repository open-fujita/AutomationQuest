// ============================================================
// practiceMockApp — 実機練習編用の汎用練習アプリ（MockApp）
//
// 「ボタン・入力欄・小さな一覧を持つ」汎用練習アプリ。
// レクチャー（クリック/値を抽出/テキストを入力/要素の繰り返し/ガードチョイス）で
// RecorderView から右クリック挿入の練習ができるよう設計。
//
// ウィジェット構成（tick=0 の初期状態）:
//   window[name="在庫管理システム"]
//     label[name="品目コード"]
//     textfield[name="品目コード入力"]         ← テキストを入力 の練習ターゲット
//     button[name="検索"]  (enabled=true)     ← クリック の練習ターゲット
//     label[name="在庫数"] (visible=true)
//     textfield[name="在庫数表示"]  value="--"  ← 値を抽出 の練習ターゲット
//     textfield[name="在庫数表示_結果"] value="42" (visible=false)
//     listview[name="仕入れ一覧"]             ← 要素の繰り返し の練習ターゲット
//       listitem[name="仕入先A"] "株式会社サクラ"
//       listitem[name="仕入先B"] "山田商事"
//       listitem[name="仕入先C"] "東京物産"
//     button[name="完了"]  (visible=true, enabled=false)  ← ガードチョイス の練習
//
// timeline:
//   tick=3: 在庫数表示_結果（value="42"）が表示される（検索実行のシミュレーション）
//   tick=5: 完了ボタンが enabled=true になる（ガードチョイスの「要素が見つかる」練習）
// ============================================================

import type { MockApp, AppWidget } from '../model/mockApp'

// ---- ウィジェット生成ヘルパー ---------------------------------

const w = (
  id: string,
  type: AppWidget['type'],
  attrs: Record<string, string>,
  children: AppWidget[] = [],
  text?: string,
  visible = true,
  enabled?: boolean,
): AppWidget => ({ id, type, attrs, children, text, visible, enabled })

// 仕入れ一覧のアイテム（For Each の練習対象）
const listItem = (id: string, name: string, text: string): AppWidget =>
  w(id, 'listitem', { name }, [], text)

// ---- 練習用アプリ初期ウィジェットツリー（tick=0）--------------

const initialWidgets: AppWidget[] = [
  w(
    'win-main',
    'window',
    { name: '在庫管理システム', title: '在庫管理システム v2.0' },
    [
      // 品目コード入力エリア（テキストを入力 の練習）
      w('label-code', 'label', { name: '品目コード' }, [], '品目コード:'),
      w('input-code', 'textfield', { name: '品目コード入力', value: '' }, [], ''),

      // 検索ボタン（クリック の練習）
      w('btn-search', 'button', { name: '検索' }, [], '検索', true, true),

      // 在庫数表示（値を抽出 の練習）
      w('label-stock', 'label', { name: '在庫数' }, [], '在庫数:'),
      // tick=0: "--" を表示（検索前）
      w('input-stock', 'textfield', { name: '在庫数表示', value: '--' }, [], '--', true),
      // tick=3 以降: "42" に差し替わる（初期 visible=false → tick=3 で showWidget）
      w('input-stock-42', 'textfield', { name: '在庫数表示', value: '42' }, [], '42', false),

      // 仕入れ一覧（要素の繰り返し / ガードチョイス の練習）
      // ウィジェット型は listitem だが、コンテナとして子を持つ（実機の listview 相当）
      w(
        'list-suppliers',
        'listitem',
        { name: '仕入れ一覧' },
        [
          listItem('item-a', '仕入先A', '株式会社サクラ'),
          listItem('item-b', '仕入先B', '山田商事'),
          listItem('item-c', '仕入先C', '東京物産'),
        ],
      ),

      // 完了ボタン（初期: enabled=false。tick=5 で有効化 → ガードチョイスの練習）
      w('btn-complete', 'button', { name: '完了' }, [], '完了', true, false),
    ],
  ),
]

// ---- 練習用 MockApp（RecorderView に渡す）---------------------

/**
 * 実機練習編で RecorderView に渡す汎用練習アプリ。
 *
 * 各レクチャーの練習対象:
 *   クリック          → button[name="検索"]
 *   テキストを入力    → textfield[name="品目コード入力"]
 *   値を抽出          → textfield[name="在庫数表示"]（tick=0 では "--"、tick=3 以降は "42"）
 *   要素の繰り返し    → listitem[name="仕入れ一覧"] の子要素 listitem
 *   ガード チョイス   → button[name="完了"]（tick=5 で enabled=true になる → locationFound 練習）
 */
export const PRACTICE_MOCK_APP: MockApp = {
  id: 'practice-mock-app',
  windowTitle: '在庫管理システム（練習用）',
  widgets: initialWidgets,
  timeline: [
    // tick=3: 在庫数表示_結果（"42"）を表示（検索完了のシミュレーション）
    {
      tick: 3,
      type: 'showWidget',
      widgetId: 'input-stock-42',
    },
    // tick=5: 完了ボタンが有効化（ガードチョイスの「該当するロケーション」練習）
    {
      tick: 5,
      type: 'enableWidget',
      widgetId: 'btn-complete',
    },
  ],
}
