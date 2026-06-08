/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design Studio 風 + 落ち着いた業務 SaaS トーン
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
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Hiragino Kaku Gothic ProN"', 'Meiryo', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
