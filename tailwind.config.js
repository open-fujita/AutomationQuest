/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design Studio 風 + 落ち着いた業務 SaaS トーン（ゲーム層・青ロボット用ダークテーマ）
        ds: {
          bg: '#1e2230',          // 全体背景（濃紺）
          panel: '#272c3d',       // パネル背景
          panelAlt: '#2f3650',    // パネル副背景
          border: '#3b425e',      // パネル境界線
          border2: '#4a5374',     // 強調境界線
          text: '#e6e9f2',
          textDim: '#9aa3bd',
          accent: '#e0b341',      // 琥珀（アクセント）
          accent2: '#4a90d9',     // DS 青
          ok: '#4caf7d',
          warn: '#e0a23a',
          err: '#e0596b',
        },
        // 緑ロボット（DAS）ワークスペース用ライトテーマトークン
        // 実機 DS 準拠: 白キャンバス・白カード・濃グレー文字・薄グレー枠線
        das: {
          bg: '#ffffff',          // キャンバス・カード背景（白）
          panel: '#f8f9fa',       // パネル背景（ごく薄いグレー）
          panelAlt: '#f0f2f5',    // パネル副背景・タブバー
          border: '#d0d4dc',      // パネル境界線（薄グレー）
          border2: '#b0b7c3',     // 強調境界線
          text: '#1f2937',        // 本文（ほぼ黒: gray-800相当、コントラスト比 ≥ 7:1）
          textDim: '#4b5563',     // 補助テキスト（gray-600: 白地で 5.9:1）
          accent: '#b45309',      // 琥珀アクセント（ライト地用: amber-700）
          accent2: '#2563eb',     // DS 青（blue-600: 白地で 4.7:1）
          ok: '#16a34a',          // 成功（green-600）
          warn: '#d97706',        // 警告（amber-600）
          err: '#dc2626',         // エラー（red-600）
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Hiragino Kaku Gothic ProN"', 'Meiryo', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
