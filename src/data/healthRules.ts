// ============================================================
// 健康なロボットのための10か条 — 定義データ＋ミッション別フォーカス条マッピング
// ============================================================

import type { HealthRule } from '../model/health'

/** 出典 URL（リファレンスパネルに表示） */
export const HEALTH_RULES_SOURCE_URL =
  'https://rpa-technologies.com/catalog/10RulesOfHealthyRobots.pdf'

export const HEALTH_RULES_SOURCE_LABEL =
  'RPA Technologies【入門】V1.0.0 2020.02.20「健康なロボットのための10か条」'

/** 10 か条の定義（全条） */
export const HEALTH_RULES: HealthRule[] = [
  {
    id: 'rule-1',
    number: 1,
    title: 'ロボットのサイズはコンパクトに保つこと',
    description:
      'ステップ数は 100〜200 以内を目安に。開いたとき全体が見渡せる範囲にまとめましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-2',
    number: 2,
    title: '単一の処理に集中すること',
    description:
      '1 つのロボットには 1 つの役割だけ。処理を単純に分解して順次組み合わせれば、エラー時の影響も小さくなります。',
    diagnosable: false,
  },
  {
    id: 'rule-3',
    number: 3,
    title: 'ロボットのフローに業務処理の骨格が明確に表れていること',
    description:
      '初見でも業務内容がわかるステップ名を付け、処理の塊をグループ化しましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-4',
    number: 4,
    title: '補助処理と本処理を明確に区別すること',
    description:
      '前処理と本処理を分けて配置し、エラーの原因がデータかプロセスか判別しやすくしましょう。',
    diagnosable: false,
  },
  {
    id: 'rule-5',
    number: 5,
    title: '同一・類似の処理を複数存在させないこと',
    description:
      '繰り返す手続きは Snippet 化し、繰り返し使う値は変数で一元管理しましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-6',
    number: 6,
    title: '用途や内容ごとにデータを整理整頓すること',
    description:
      '入力・出力・一時データを Type で整理。手順を作る前にデータの棚卸しをしましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-7',
    number: 7,
    title: '処理内容の見通しをよくするための案内・コメントを適所に設置すること',
    description:
      'Group で区切りを示し、業務内容を示すコメントを残しましょう。簡易業務マニュアルにもなります。',
    diagnosable: false,
  },
  {
    id: 'rule-8',
    number: 8,
    title: 'ロボット実行時の処理経路がトレースできるように適度にログ出力を設定すること',
    description:
      'Write Log でパンくずを残し、データのキー情報をログに記録しましょう。',
    // 緑ロボのログ出力ステップが未実装のため現状は判定対象外
    diagnosable: false,
  },
  {
    id: 'rule-9',
    number: 9,
    title: '例外処理はログと通知を重視し、自動回復は最低限とすること',
    description:
      '例外を確実にとらえてログ・通知を出し、自動回復ロジックは極力含めないようにしましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-10',
    number: 10,
    title: '環境変数値はロボット内に組み込まず、外部情報の読み込みで切り替えること',
    description:
      'ファイルパスや URL、アカウント情報は外部設定で管理。直書きするとテストの品質担保が無効になります。',
    diagnosable: true,
  },
]

/**
 * ミッション ID → フォーカスする条番号のマッピング。
 * Mission 型の healthFocus フィールドに設定する値の一元管理。
 */
export const MISSION_HEALTH_FOCUS: Record<string, number[]> = {
  // ---- 青ロボット（M1〜M5）----
  m1: [1, 3],  // M1: ステップ数コンパクト＋ステップ名を付けよう
  m2: [6],     // M2: Type 整理（複合型を定義してデータを整理）
  m3: [3, 5],  // M3: 業務の骨格＋条件分岐による重複排除
  m4: [1],     // M4: 全件取得でもコンパクトに
  m5: [10],    // M5: 入力変数を使い直書き禁止

  // ---- 緑ロボット（D1〜D5）----
  d1: [1, 3],  // D1: 基本 3 ステップで全体俯瞰＋名前付け
  d2: [9],     // D2: ガード＋Timeout による例外系の設計
  d3: [9],     // D3: 不測の割り込み＝例外として捉える
  d4: [5, 6],  // D4: For Each で重複排除＋データ整理
  d5: [10],    // D5: セレクタ＝環境依存値を外部化する思考
}
