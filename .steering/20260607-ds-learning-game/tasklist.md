---
index: "[[INDEX]]"
---

# tasklist — DS 学習シミュレーションゲーム（縦切り初版）

> 親 INDEX: [[INDEX]]

| # | タスク | ロール | 状態 | 完了条件 |
|---|---|---|---|---|
| T1 | Vite + React + TS + Tailwind + React Flow + Zustand 土台構築 | Frontend/DevOps | ✅ | dev/build/typecheck が通る |
| T2 | ロボットモデル / サイト / ミッション / 健康度 / sim の型定義 | Frontend | ✅ | SCHEMA.md 準拠の型が揃う |
| T3 | シミュレータ（runRobot：ループ内外で抽出件数が変わる） | Backend/Frontend | ✅ | 単体テストで挙動確認 |
| T4 | バリデータ（check ビルダー + validateMission） | Backend/Frontend | ✅ | 未達ヒントを返す |
| T5 | 状態管理 robotStore / gameStore（localStorage 永続） | Frontend | ✅ | リロードで進捗保持 |
| T6 | DS 画面コンポーネント 7 種 + パレット + ツールバー | Frontend | ✅ | 4 領域 UI が表示 |
| T7 | ロボットビュー（React Flow + StepNode） | Frontend | ✅ | ステップが左→右に連結表示 |
| T8 | ブラウザビュー（模擬サイト + 右クリック操作割り当て） | Frontend | ✅ | 右クリックでステップ生成 |
| T9 | ゲーム層（briefing/deduction/result/progress/glossary） | Frontend | ✅ | 4 フェーズが遷移 |
| T10 | ミッション M1・M2 + 模擬サイト + 推理 + 推理オチ | Frontend | ✅ | 通しで遊べる |
| T11 | BizRobo 用語集データ・解禁演出 | Frontend | ✅ | クリアで用語解禁 |
| T12 | 依頼者ポートレート画像（gpt-image-2） | — | ✅ | public/img に 2 枚 |
| T13 | エンジン検証テスト（vitest） | Tester | ✅ | M1/M2 正常系・異常系 5 件 green |
| T14 | ビルド・型・テスト最終確認 | Reviewer | ✅ | [[review]] 参照 |

## 並列実行メモ
greenfield のため土台(T1) → 型(T2) を直列、以降のエンジン/UI/データは相互参照しつつ実装。
実運用では T3/T4（エンジン）と T6〜T9（UI）を別ロールで並列化可能。
