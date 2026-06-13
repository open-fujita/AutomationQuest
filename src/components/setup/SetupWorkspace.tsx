// ============================================================
// SetupWorkspace — S1「セットアップ: DAS につなぐ」専用ワークスペース
//
// 構成:
//   - 上部: MissionBar（受け入れ条件）+ QuestNavigator（ナビゲータ）
//   - 中央: PC モチーフ領域（デスクトップ + DS ウィンドウ）
//   - 下部: Windows 風タスクトレイ（DAS アイコン）
//
// 操作フロー（プレイヤー視点）:
//   1. タスクトレイの DAS アイコン → 「Desktop Automation サービス」ダイアログ
//   2. ダイアログでホスト名入力 / シングルユーザーチェック / トークン入力 / 保存して再起動
//   3. 再起動アニメーション（2 秒）→ サービス「実行中」表示
//   4. DS パネルで「ファイル → 新しいオートメーション デバイス マッピング」
//   5. マッピングダイアログ（名前/ホスト/ポート/トークン） → 追加
//   6. 「接続テスト」ボタン → トークン一致で成功（緑表示）・不一致で失敗（赤表示）
//   7. 全チェック達成 → 完了フローへ（completeMission/ResultPanel）
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mission } from '../../model/mission'
import type { SetupState } from '../../model/setup'
import { INITIAL_SETUP_STATE } from '../../model/setup'
import { connect, validateSetupMission } from '../../engine/setupChecks'
import { useGameStore } from '../../store/gameStore'
import { MISSIONS } from '../../data/missions'
import { GLOSSARY } from '../../data/glossary'

import Toolbar from '../ds/Toolbar'
import MissionBar from '../game/MissionBar'
import MissionBriefing from '../game/MissionBriefing'
import DeductionPanel from '../game/DeductionPanel'
import Glossary from '../game/Glossary'
import ProgressMap from '../game/ProgressMap'
import HealthRulesPanel from '../game/HealthRulesPanel'
import QuestNavigator from '../game/QuestNavigator'

// ---- 型 -------------------------------------------------------

interface SetupWorkspaceProps {
  mission: Mission
}

// ---- DAS 設定ダイアログ（実機画像忠実再現）--------------------

/** ダイアログの現在アクティブなタブ */
type DasDialogTab = 'management' | 'singleuser' | 'cert' | 'windows' | 'ocr' | 'system'

interface DasDialogProps {
  /** 親コンポーネントが保持する入力状態（draft） */
  hostName: string
  singleUserEnabled: boolean
  token: string
  onHostNameChange: (v: string) => void
  onSingleUserChange: (v: boolean) => void
  onTokenChange: (v: string) => void
  onSaveRestart: () => void
  onCancel: () => void
  restarting: boolean
}

function DasDialog({
  hostName,
  singleUserEnabled,
  token,
  onHostNameChange,
  onSingleUserChange,
  onTokenChange,
  onSaveRestart,
  onCancel,
  restarting,
}: DasDialogProps) {
  const [activeTab, setActiveTab] = useState<DasDialogTab>('singleuser')

  const TABS: { id: DasDialogTab; label: string }[] = [
    { id: 'management', label: 'Management Console' },
    { id: 'singleuser', label: 'シングル ユーザー' },
    { id: 'cert', label: '証明書' },
    { id: 'windows', label: 'Windows' },
    { id: 'ocr', label: 'OCR' },
    { id: 'system', label: 'システム' },
  ]

  return (
    // ウィンドウ外クリックで閉じる用オーバーレイ
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Desktop Automation サービス 設定ダイアログ"
    >
      {/* ウィンドウ本体: Windows 風の白背景・シャープな角 */}
      <div className="w-[480px] select-none overflow-hidden rounded border border-[#999] bg-[#f0f0f0] shadow-2xl">
        {/* タイトルバー */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#4a90d9] to-[#2c6fad] px-2 py-1.5">
          {/* BizRobo アイコン風 */}
          <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-orange-500 text-[10px] text-white font-bold leading-none">
            RPA
          </div>
          <span className="flex-1 text-[13px] font-semibold text-white">Desktop Automation サービス</span>
          {/* ウィンドウコントロール */}
          <div className="flex items-center gap-0.5">
            <button className="rounded-sm px-2 py-0.5 text-[12px] text-white/80 hover:bg-white/20" aria-label="最小化">─</button>
            <button className="rounded-sm px-2 py-0.5 text-[12px] text-white/80 hover:bg-white/20" aria-label="最大化">□</button>
            <button
              onClick={onCancel}
              className="rounded-sm px-2 py-0.5 text-[12px] text-white/80 hover:bg-red-500 hover:text-white"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ダイアログ本体 */}
        <div className="bg-[#f0f0f0] px-4 py-3 text-[13px] text-[#1a1a1a]">
          {/* フィールド群: ホスト名 / コマンドポート / ストリームポート / CA ファイル / タイムアウト */}
          <div className="space-y-2">
            {/* ホスト名 */}
            <div className="flex items-center gap-2">
              <label className="w-[110px] shrink-0 text-right text-[12px]" htmlFor="das-hostname">
                ホスト名
              </label>
              <input
                id="das-hostname"
                type="text"
                value={hostName}
                onChange={(e) => onHostNameChange(e.target.value)}
                className="flex-1 rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none focus:border-[#4a90d9]"
                placeholder="XXXXXXXX"
                aria-label="ホスト名（コンピュータ名または IP アドレス）"
                autoFocus
              />
            </div>
            {/* コマンドポート */}
            <div className="flex items-center gap-2">
              <label className="w-[110px] shrink-0 text-right text-[12px]" htmlFor="das-cmdport">
                コマンド ポート
              </label>
              <div className="flex items-center">
                <input
                  id="das-cmdport"
                  type="number"
                  defaultValue={49998}
                  className="w-[90px] rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none"
                  aria-label="コマンドポート番号（固定値 49998）"
                  readOnly
                />
                {/* スピナー風 */}
                <div className="ml-0.5 flex flex-col border border-[#aaa]">
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="増加">▲</button>
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="減少">▼</button>
                </div>
              </div>
            </div>
            {/* ストリームポート */}
            <div className="flex items-center gap-2">
              <label className="w-[110px] shrink-0 text-right text-[12px]" htmlFor="das-streamport">
                ストリーム ポート
              </label>
              <div className="flex items-center">
                <input
                  id="das-streamport"
                  type="number"
                  defaultValue={49999}
                  className="w-[90px] rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none"
                  aria-label="ストリームポート番号（固定値 49999）"
                  readOnly
                />
                <div className="ml-0.5 flex flex-col border border-[#aaa]">
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="増加">▲</button>
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="減少">▼</button>
                </div>
              </div>
            </div>
            {/* CA ファイル */}
            <div className="flex items-center gap-2">
              <label className="w-[110px] shrink-0 text-right text-[12px]" htmlFor="das-cafile">
                CA ファイル
              </label>
              <input
                id="das-cafile"
                type="text"
                defaultValue=""
                className="flex-1 rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none"
                aria-label="CA ファイルパス（この研修では使用しません）"
                readOnly
              />
            </div>
            {/* タイムアウト */}
            <div className="flex items-center gap-2">
              <label className="w-[110px] shrink-0 text-right text-[12px]" htmlFor="das-timeout">
                タイムアウト
              </label>
              <div className="flex items-center">
                <input
                  id="das-timeout"
                  type="number"
                  defaultValue={60}
                  className="w-[90px] rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none"
                  aria-label="タイムアウト秒数（固定値 60）"
                  readOnly
                />
                <div className="ml-0.5 flex flex-col border border-[#aaa]">
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="増加">▲</button>
                  <button className="px-1 text-[9px] text-[#555] hover:bg-[#ddd]" aria-label="減少">▼</button>
                </div>
              </div>
            </div>
          </div>

          {/* シングルユーザーチェックボックス */}
          <div className="mt-3 flex items-center gap-2">
            <input
              id="das-singleuser"
              type="checkbox"
              checked={singleUserEnabled}
              onChange={(e) => onSingleUserChange(e.target.checked)}
              className="h-4 w-4 accent-[#4a90d9]"
              aria-label="シングルユーザーモードを有効にする"
            />
            <label htmlFor="das-singleuser" className="cursor-pointer text-[13px]">
              シングル ユーザー
            </label>
          </div>

          {/* タブバー */}
          <div className="mt-3 flex border-b border-[#bbb]" role="tablist" aria-label="設定タブ">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`das-tab-panel-${tab.id}`}
                onClick={() => {
                  if (tab.id === 'singleuser') {
                    setActiveTab(tab.id)
                  } else {
                    setActiveTab(tab.id)
                  }
                }}
                className={[
                  'px-2 py-1 text-[11px] leading-tight whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border border-b-0 border-[#bbb] bg-[#f0f0f0] -mb-px text-[#1a1a1a] font-semibold'
                    : 'text-[#444] hover:bg-[#e0e0e0]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div className="min-h-[90px] border border-t-0 border-[#bbb] bg-white p-3">
            {/* シングルユーザータブ: トークン入力（操作可能） */}
            {activeTab === 'singleuser' && (
              <div
                id="das-tab-panel-singleuser"
                role="tabpanel"
                aria-label="シングルユーザー設定"
              >
                <div className="flex items-center gap-2">
                  <label className="w-[60px] shrink-0 text-right text-[12px]" htmlFor="das-token">
                    トークン
                  </label>
                  <input
                    id="das-token"
                    type="text"
                    value={token}
                    onChange={(e) => onTokenChange(e.target.value)}
                    className="flex-1 rounded-sm border border-[#aaa] bg-white px-2 py-0.5 text-[13px] font-mono outline-none focus:border-[#4a90d9]"
                    placeholder="DA01"
                    aria-label="シングルユーザートークン（DS 側と同じ値を設定してください）"
                    disabled={!singleUserEnabled}
                  />
                </div>
                {!singleUserEnabled && (
                  <p className="mt-2 text-[11px] text-[#888]">
                    ※ 上の「☑ シングル ユーザー」をオンにするとトークンを入力できます。
                  </p>
                )}
              </div>
            )}
            {/* Management Console タブ（表示のみ） */}
            {activeTab === 'management' && (
              <div id="das-tab-panel-management" role="tabpanel" className="text-[11px] text-[#666]">
                Management Console 接続設定（この研修では使用しません）
              </div>
            )}
            {/* 証明書タブ（表示のみ） */}
            {activeTab === 'cert' && (
              <div id="das-tab-panel-cert" role="tabpanel" className="text-[11px] text-[#666]">
                証明書設定（この研修では使用しません）
              </div>
            )}
            {/* Windows タブ（表示のみ） */}
            {activeTab === 'windows' && (
              <div id="das-tab-panel-windows" role="tabpanel" className="text-[11px] text-[#666]">
                Windows 認証設定（この研修では使用しません）
              </div>
            )}
            {/* OCR タブ（表示のみ） */}
            {activeTab === 'ocr' && (
              <div id="das-tab-panel-ocr" role="tabpanel" className="text-[11px] text-[#666]">
                OCR 設定（この研修では使用しません）
              </div>
            )}
            {/* システムタブ（表示のみ） */}
            {activeTab === 'system' && (
              <div id="das-tab-panel-system" role="tabpanel" className="text-[11px] text-[#666]">
                システム情報（この研修では使用しません）
              </div>
            )}
          </div>

          {/* 下部ボタン */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="rounded-sm border border-[#aaa] bg-[#e8e8e8] px-4 py-1 text-[12px] text-[#333] hover:bg-[#d8d8d8]"
              aria-label="ヘルプを表示"
            >
              ヘルプ
            </button>
            <button
              onClick={onCancel}
              className="rounded-sm border border-[#aaa] bg-[#e8e8e8] px-4 py-1 text-[12px] text-[#333] hover:bg-[#d8d8d8]"
              aria-label="変更を破棄してダイアログを閉じる"
            >
              キャンセル
            </button>
            <button
              onClick={onSaveRestart}
              disabled={restarting}
              className={[
                'rounded-sm border px-4 py-1 text-[12px] font-semibold',
                restarting
                  ? 'cursor-not-allowed border-[#aaa] bg-[#ddd] text-[#999]'
                  : 'border-[#4a90d9] bg-[#4a90d9] text-white hover:bg-[#3a7fd9]',
              ].join(' ')}
              aria-label="設定を保存して Desktop Automation サービスを再起動する"
            >
              {restarting ? '再起動中…' : '保存して再起動'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- デバイスマッピングダイアログ（DS 側） --------------------

interface MappingDialogProps {
  name: string
  host: string
  commandPort: number
  token: string
  onNameChange: (v: string) => void
  onHostChange: (v: string) => void
  onCommandPortChange: (v: number) => void
  onTokenChange: (v: string) => void
  onAdd: () => void
  onCancel: () => void
}

function MappingDialog({
  name,
  host,
  commandPort,
  token,
  onNameChange,
  onHostChange,
  onCommandPortChange,
  onTokenChange,
  onAdd,
  onCancel,
}: MappingDialogProps) {
  const canAdd = name.trim() !== '' && host.trim() !== '' && commandPort > 0 && token.trim() !== ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="新しいオートメーション デバイス マッピング ダイアログ"
    >
      <div className="w-[420px] overflow-hidden rounded-lg border border-das-border2 bg-das-panel shadow-2xl">
        {/* タイトルバー（DS スタイル: 暗背景） */}
        <div className="flex items-center justify-between border-b border-das-border bg-das-panelAlt px-4 py-2.5">
          <span className="text-[13px] font-bold text-das-text">
            新しいオートメーション デバイス マッピング
          </span>
          <button
            onClick={onCancel}
            className="rounded px-2 text-das-textDim hover:text-das-text"
            aria-label="ダイアログを閉じる"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4 text-[13px]">
          {/* 名前 */}
          <div className="flex items-center gap-3">
            <label className="w-[100px] shrink-0 text-right text-das-textDim" htmlFor="mapping-name">
              名前
            </label>
            <input
              id="mapping-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 text-das-text outline-none focus:border-das-accent2"
              placeholder="MyDevice"
              autoFocus
              aria-required="true"
            />
          </div>
          {/* ホスト名 */}
          <div className="flex items-center gap-3">
            <label className="w-[100px] shrink-0 text-right text-das-textDim" htmlFor="mapping-host">
              ホスト名
            </label>
            <input
              id="mapping-host"
              type="text"
              value={host}
              onChange={(e) => onHostChange(e.target.value)}
              className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 font-mono text-das-text outline-none focus:border-das-accent2"
              placeholder="localhost"
              aria-required="true"
            />
          </div>
          {/* コマンドポート */}
          <div className="flex items-center gap-3">
            <label className="w-[100px] shrink-0 text-right text-das-textDim" htmlFor="mapping-port">
              コマンド ポート
            </label>
            <input
              id="mapping-port"
              type="number"
              value={commandPort === 0 ? '' : commandPort}
              onChange={(e) => onCommandPortChange(Number(e.target.value))}
              className="w-[100px] rounded border border-das-border bg-das-bg px-2 py-1 font-mono text-das-text outline-none focus:border-das-accent2"
              placeholder="49998"
              aria-required="true"
            />
          </div>
          {/* トークン */}
          <div className="flex items-center gap-3">
            <label className="w-[100px] shrink-0 text-right text-das-textDim" htmlFor="mapping-token">
              トークン
            </label>
            <input
              id="mapping-token"
              type="text"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 font-mono text-das-text outline-none focus:border-das-accent2"
              placeholder="DA01"
              aria-required="true"
              aria-describedby="mapping-token-hint"
            />
          </div>
          <p id="mapping-token-hint" className="pl-[112px] text-[11px] text-das-textDim">
            ※ DAS 側のシングルユーザータブに設定したトークンと同じ値にしてください。
          </p>

          {/* ボタン */}
          <div className="mt-2 flex justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="rounded border border-das-border bg-das-panelAlt px-4 py-1.5 text-[12px] text-das-text hover:border-das-border2"
            >
              キャンセル
            </button>
            <button
              onClick={onAdd}
              disabled={!canAdd}
              className={[
                'rounded px-4 py-1.5 text-[12px] font-bold',
                canAdd
                  ? 'bg-das-accent2 text-white hover:brightness-110'
                  : 'cursor-not-allowed bg-das-border text-das-textDim',
              ].join(' ')}
              aria-label="デバイスマッピングを追加"
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- タスクトレイバー -----------------------------------------

interface TrayBarProps {
  dasServiceStatus: 'stopped' | 'restarting' | 'running'
  onDasIconClick: () => void
}

function TrayBar({ dasServiceStatus, onDasIconClick }: TrayBarProps) {
  const now = new Date()
  const hm = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <div
      className="flex h-9 shrink-0 items-center justify-end gap-1 border-t border-[#c0c0c0] bg-[#e4e4e4] px-2 shadow-[inset_0_1px_0_#fff]"
      aria-label="Windows タスクトレイ"
      role="region"
    >
      {/* 通知エリア（省略表示） */}
      <div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#333]">
        {/* DAS アイコン（BizRobo ロボット風） */}
        <button
          onClick={onDasIconClick}
          className={[
            'relative flex h-6 w-6 items-center justify-center rounded-sm text-[13px] transition-all',
            dasServiceStatus === 'running'
              ? 'bg-green-100 text-green-700 ring-1 ring-green-400'
              : dasServiceStatus === 'restarting'
                ? 'animate-pulse bg-yellow-100 text-yellow-600 ring-1 ring-yellow-400'
                : 'bg-[#ddd] text-[#666] ring-1 ring-[#bbb]',
          ].join(' ')}
          title={
            dasServiceStatus === 'running'
              ? 'Desktop Automation サービス（実行中）— クリックで設定を開く'
              : dasServiceStatus === 'restarting'
                ? 'Desktop Automation サービス（再起動中…）'
                : 'Desktop Automation サービス（停止中）— クリックで設定を開く'
          }
          aria-label="Desktop Automation サービス アイコン"
          aria-haspopup="dialog"
          disabled={dasServiceStatus === 'restarting'}
        >
          🤖
          {/* ステータスドット */}
          <span
            className={[
              'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white',
              dasServiceStatus === 'running'
                ? 'bg-green-500'
                : dasServiceStatus === 'restarting'
                  ? 'bg-yellow-500'
                  : 'bg-[#999]',
            ].join(' ')}
            aria-hidden="true"
          />
        </button>
        {/* その他通知アイコン（ダミー） */}
        <span className="text-[12px] text-[#555]" aria-hidden="true">🔊</span>
        <span className="text-[12px] text-[#555]" aria-hidden="true">🌐</span>
      </div>
      {/* 時計 */}
      <div className="ml-1 flex flex-col items-end justify-center rounded px-1.5 py-0.5 text-[10px] leading-tight text-[#333] hover:bg-[#ccc]">
        <span className="font-semibold">{hm}</span>
        <span>{date}</span>
      </div>
    </div>
  )
}

// ---- デバイス一覧（マッピング追加後に表示）------------------

interface DeviceListProps {
  state: SetupState
}

function DeviceList({ state }: DeviceListProps) {
  const { mapping, connectionResult } = state
  if (!mapping.name) return null

  const ok = connectionResult?.ok === true

  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-das-textDim">
        オートメーション デバイス
      </div>
      <div
        className={[
          'flex items-center gap-3 rounded border px-3 py-2 text-[13px]',
          ok
            ? 'border-green-300 bg-green-50 text-das-text'
            : connectionResult && !connectionResult.ok
              ? 'border-red-300 bg-red-50 text-das-text'
              : 'border-das-border bg-das-bg text-das-text',
        ].join(' ')}
        aria-live="polite"
      >
        <span className="text-[16px]" aria-hidden="true">🖥</span>
        <div className="flex-1">
          <div className="font-semibold">{mapping.name}</div>
          <div className="text-[11px] text-das-textDim">
            {mapping.host}:{mapping.commandPort} — トークン: {mapping.token || '(未設定)'}
          </div>
        </div>
        {/* ステータスバッジ */}
        {ok ? (
          <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
            利用可能
          </span>
        ) : connectionResult && !connectionResult.ok ? (
          <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
            接続失敗
          </span>
        ) : (
          <span className="rounded bg-[#eee] px-2 py-0.5 text-[11px] text-[#777]">
            未接続
          </span>
        )}
      </div>

      {/* 失敗メッセージ */}
      {connectionResult && !connectionResult.ok && (
        <div className="mt-1.5 rounded bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700" role="alert">
          {connectionResult.reason === 'token_mismatch' && (
            <>
              <strong>トークンが一致しません。</strong>
              DAS 側（シングルユーザータブ）と DS 側（マッピングのトークン）に<strong>同じ値</strong>を設定してください。
            </>
          )}
          {connectionResult.reason === 'host_empty' && (
            <>
              <strong>ホスト名が設定されていません。</strong>
              DAS の設定ダイアログで「ホスト名」を入力してください。
            </>
          )}
          {connectionResult.reason === 'not_saved' && (
            <>
              <strong>「保存して再起動」が実行されていません。</strong>
              DAS ダイアログの「保存して再起動」ボタンをクリックしてください。
            </>
          )}
          {connectionResult.reason === 'single_user_disabled' && (
            <>
              <strong>シングルユーザーが有効になっていません。</strong>
              DAS ダイアログの「☑ シングル ユーザー」をオンにして「保存して再起動」してください。
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---- ResultPanel セットアップ版（setup 専用） ----------------

interface SetupResultPanelProps {
  mission: Mission
  state: SetupState
  hasNext: boolean
  onNext: () => void
}

function SetupResultPanel({ mission, state, hasNext, onNext }: SetupResultPanelProps) {
  const revealText = mission.setupReveal ? mission.setupReveal(state) : ''

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-das-border2 bg-das-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-das-border bg-das-panelAlt px-4 py-2.5">
          <div className="text-[14px] font-bold text-das-text">
            セットアップ完了！「{mission.title}」
          </div>
        </div>
        <div className="max-h-[78vh] overflow-auto p-5">
          <div className="text-center">
            <div className="text-[40px]">🔗🎉</div>
            <div className="mt-1 text-[15px] font-bold text-das-accent">DAS 接続設定 完了</div>
          </div>

          {/* 成果 */}
          <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-[13px] leading-relaxed text-das-text">
            {revealText.split('\n\n').map((para, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {para.split('\n').map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>

          {/* 用語 */}
          <div className="mt-4">
            <div className="mb-1 text-[12px] font-semibold text-das-textDim">この相談で身についた用語</div>
            <div className="flex flex-wrap gap-1.5">
              {mission.glossary.map((k) => (
                <span key={k} className="rounded-full bg-das-panelAlt px-2.5 py-0.5 text-[11px] text-das-text" title={GLOSSARY[k]?.desc}>
                  {GLOSSARY[k]?.term ?? k}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            {hasNext ? (
              <button
                onClick={onNext}
                className="rounded-lg bg-das-accent2 px-5 py-2 text-[14px] font-bold text-white hover:brightness-110"
              >
                緑ロボット編へ →
              </button>
            ) : (
              <div className="text-center text-[13px] text-das-textDim">お疲れさまでした。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- SetupWorkspace（メインコンポーネント）------------------

export default function SetupWorkspace({ mission }: SetupWorkspaceProps) {
  // ゲームストア
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const completeMission = useGameStore((s) => s.completeMission)
  const unlockTerms = useGameStore((s) => s.unlockTerms)
  const goHome = useGameStore((s) => s.goHome)
  const setMission = useGameStore((s) => s.setMission)
  const currentMissionId = useGameStore((s) => s.currentMissionId)

  // セットアップ状態（ローカル — ストア汚染なし）
  const [state, setState] = useState<SetupState>(INITIAL_SETUP_STATE)

  // UI 状態
  const [showDasDialog, setShowDasDialog] = useState(false)
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showHealthRules, setShowHealthRules] = useState(false)

  // DAS ダイアログの下書き（キャンセル対応のため別 state）
  const [draftHostName, setDraftHostName] = useState('')
  const [draftSingleUser, setDraftSingleUser] = useState(false)
  const [draftToken, setDraftToken] = useState('')

  // マッピングダイアログの下書き
  const [draftMappingName, setDraftMappingName] = useState('')
  const [draftMappingHost, setDraftMappingHost] = useState('')
  const [draftMappingPort, setDraftMappingPort] = useState(49998)
  const [draftMappingToken, setDraftMappingToken] = useState('')

  // 再起動アニメーション
  const [restarting, setRestarting] = useState(false)
  const [dasStatus, setDasStatus] = useState<'stopped' | 'restarting' | 'running'>('stopped')

  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ミッション切り替え時に状態をリセット
  useEffect(() => {
    setState(INITIAL_SETUP_STATE)
    setPhase('briefing')
    setShowDasDialog(false)
    setShowMappingDialog(false)
    setRestarting(false)
    setDasStatus('stopped')
    setDraftHostName('')
    setDraftSingleUser(false)
    setDraftToken('')
    setDraftMappingName('')
    setDraftMappingHost('')
    setDraftMappingPort(49998)
    setDraftMappingToken('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMissionId])

  // アンマウント時タイマークリア
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    }
  }, [])

  // バリデーション（setupChecks を SetupState に対して評価）
  const validation = useMemo(() => {
    const checks = mission.setupChecks ?? []
    if (checks.length === 0) {
      return { pass: false, outcomes: [], firstHint: null }
    }
    const result = validateSetupMission({ state }, checks)
    // QuestNavigator/MissionBar が期待する ValidationResult 形式に変換
    return {
      pass: result.pass,
      outcomes: result.outcomes.map((o) => ({ id: o.id, label: o.label, pass: o.pass, hint: o.hint })),
      firstHint: result.firstHint,
    }
  }, [state, mission.setupChecks])

  // 全チェック達成 → result フェーズへ
  useEffect(() => {
    if (phase === 'build' && validation.pass) {
      completeMission(mission.id)
      unlockTerms(mission.glossary)
      setPhase('result')
    }
  }, [phase, validation.pass, mission, completeMission, unlockTerms, setPhase])

  // DAS アイコンクリック: ダイアログを開く（現在の状態を draft に反映）
  const handleDasIconClick = () => {
    setDraftHostName(state.dasDialog.hostName)
    setDraftSingleUser(state.dasDialog.singleUserEnabled)
    setDraftToken(state.dasDialog.token)
    setShowDasDialog(true)
  }

  // 保存して再起動
  const handleSaveRestart = () => {
    // draft を state に確定
    const newDasDialog = {
      hostName: draftHostName,
      singleUserEnabled: draftSingleUser,
      token: draftToken,
      savedAndRestarted: false, // 再起動完了後に true にする
    }
    setState((prev) => ({
      ...prev,
      dasDialog: newDasDialog,
      connectionResult: null, // 設定変更で接続結果をリセット
    }))
    setShowDasDialog(false)
    setRestarting(true)
    setDasStatus('restarting')

    restartTimerRef.current = setTimeout(() => {
      setRestarting(false)
      setDasStatus('running')
      // savedAndRestarted を true に
      setState((prev) => ({
        ...prev,
        dasDialog: {
          ...prev.dasDialog,
          hostName: draftHostName,
          singleUserEnabled: draftSingleUser,
          token: draftToken,
          savedAndRestarted: true,
        },
      }))
    }, 2000)
  }

  // マッピング追加
  const handleAddMapping = () => {
    setState((prev) => ({
      ...prev,
      mapping: {
        name: draftMappingName,
        host: draftMappingHost,
        commandPort: draftMappingPort,
        token: draftMappingToken,
      },
      connectionResult: null, // マッピング変更で接続結果をリセット
    }))
    setShowMappingDialog(false)
  }

  // 接続テスト
  const handleConnect = () => {
    const result = connect(state)
    setState((prev) => ({ ...prev, connectionResult: result }))
  }

  // 次のミッションへ
  const onNext = () => {
    const idx = MISSIONS.findIndex((m) => m.id === mission.id)
    const next = MISSIONS[idx + 1]
    if (next) setMission(next.id)
  }
  const hasNext = MISSIONS.findIndex((m) => m.id === mission.id) < MISSIONS.length - 1

  // ---- レンダリング ----------------------------------------

  return (
    <div className="flex h-screen flex-col bg-das-panelAlt text-das-text">
      {/* ツールバー（ホーム・用語集・進捗） */}
      <Toolbar
        onHome={goHome}
        onOpenGlossary={() => setShowGlossary(true)}
        onOpenProgress={() => setShowProgress(true)}
        onOpenHealthRules={() => setShowHealthRules(true)}
        // セットアップミッションに「実行」ボタンは不要
        onRun={() => { /* no-op: セットアップに実行ボタンは使わない */ }}
        hideRun
      />

      {/* MissionBar: 受け入れ条件バー */}
      {(phase === 'build' || phase === 'result') && (
        <MissionBar
          mission={mission}
          validation={validation}
          ran={false}
        />
      )}

      {/* QuestNavigator: 未達成の次ステップを案内 */}
      {phase === 'build' && (
        <QuestNavigator outcomes={validation.outcomes} />
      )}

      {/* メイン: PC + DS 模擬エリア（flex-1、タスクトレイを画面下に固定するため flex-col） */}
      <main className="flex min-h-0 flex-1 flex-col">
        {/* PC デスクトップ模擬エリア */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#008080] p-4">
          {/* ラベル */}
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white/90">
              オートメーション デバイス（あなたの PC）
            </span>
            {dasStatus === 'restarting' && (
              <span className="animate-pulse rounded bg-yellow-400/80 px-2 py-0.5 text-[11px] font-semibold text-yellow-900" role="status" aria-live="polite">
                DAS を再起動しています…
              </span>
            )}
            {dasStatus === 'running' && (
              <span className="rounded bg-green-400/80 px-2 py-0.5 text-[11px] font-semibold text-green-900" role="status">
                DAS 実行中
              </span>
            )}
          </div>

          {/* 中央パネル: 左 DS ウィンドウ / 右 接続状態 */}
          <div className="flex min-h-0 flex-1 gap-4">
            {/* DS 側パネル（Design Studio 模擬） */}
            <div className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#c0c0c0] bg-[#f8f8f8] shadow-lg">
              {/* DS タイトルバー */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-[#3a7fd9] to-[#2c5fad] px-2 py-1">
                <span className="text-[11px] font-semibold text-white">Design Studio</span>
                <div className="ml-auto flex gap-1">
                  <span className="h-3 w-3 rounded-full bg-white/40" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-white/40" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-white/40" aria-hidden="true" />
                </div>
              </div>

              {/* DS メニューバー */}
              <div className="flex items-center gap-0 border-b border-[#ddd] bg-[#f0f0f0] px-1">
                {/* ファイルメニュー（クリックで新しいデバイスマッピング） */}
                <div className="relative group">
                  <button
                    className="rounded px-2 py-0.5 text-[12px] text-[#333] hover:bg-[#ddd] active:bg-[#ccc]"
                    aria-label="ファイルメニュー"
                    aria-haspopup="menu"
                  >
                    ファイル(F)
                  </button>
                  {/* ドロップダウン */}
                  <div className="absolute left-0 top-full z-20 hidden group-focus-within:block group-hover:block w-[260px] rounded border border-[#bbb] bg-white shadow-lg text-[12px]">
                    <div className="py-0.5">
                      <div className="px-3 py-1 text-[#999]">新規作成…</div>
                      <div className="px-3 py-1 text-[#999]">開く…</div>
                      <hr className="my-0.5 border-[#eee]" />
                      <button
                        onClick={() => {
                          setDraftMappingName('')
                          setDraftMappingHost(state.dasDialog.hostName || '')
                          setDraftMappingPort(49998)
                          setDraftMappingToken('')
                          setShowMappingDialog(true)
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[#1a1a1a] hover:bg-[#4a90d9] hover:text-white"
                        role="menuitem"
                      >
                        新しいオートメーション デバイス マッピング
                      </button>
                      <hr className="my-0.5 border-[#eee]" />
                      <div className="px-3 py-1 text-[#999]">終了</div>
                    </div>
                  </div>
                </div>
                <button className="rounded px-2 py-0.5 text-[12px] text-[#333] hover:bg-[#ddd]">編集(E)</button>
                <button className="rounded px-2 py-0.5 text-[12px] text-[#333] hover:bg-[#ddd]">ヘルプ(H)</button>
              </div>

              {/* DS メイン: マイプロジェクトとデバイスリスト */}
              <div className="flex min-h-0 flex-1 overflow-hidden">
                {/* 左ツリー */}
                <div className="w-[150px] shrink-0 border-r border-[#ddd] overflow-y-auto bg-[#f8f8f8] p-1.5 text-[11px]">
                  <div className="font-semibold text-[#333] mb-0.5">マイプロジェクト</div>
                  <div className="pl-2 text-[#555]">
                    <div>📁 MyProject</div>
                    <div className="pl-3 mt-0.5">🤖 robot.robot</div>
                  </div>
                  {state.mapping.name && (
                    <div className="mt-1 border-t border-[#ddd] pt-1">
                      <div className="font-semibold text-[#333] mb-0.5">デバイス</div>
                      <div className="pl-2 text-[#555]">
                        🖥 {state.mapping.name}
                      </div>
                    </div>
                  )}
                </div>

                {/* 右: コンテンツエリア */}
                <div className="min-w-0 flex-1 overflow-y-auto p-3">
                  {/* ガイドボタン: 「ファイル → 新しいオートメーション デバイス マッピング」 */}
                  {!state.mapping.name && (
                    <div className="rounded border border-dashed border-[#bbb] bg-[#fafafa] p-3 text-center text-[11px] text-[#777]">
                      <p className="mb-2 font-semibold text-[#555]">デバイスマッピングを作成しましょう</p>
                      <p className="mb-2 text-[10px] leading-relaxed">
                        メニューの <strong>「ファイル」</strong> を開いて<br />
                        「新しいオートメーション デバイス マッピング」を選択
                      </p>
                      <button
                        onClick={() => {
                          setDraftMappingName('')
                          setDraftMappingHost(state.dasDialog.hostName || '')
                          setDraftMappingPort(49998)
                          setDraftMappingToken('')
                          setShowMappingDialog(true)
                        }}
                        className="rounded bg-[#4a90d9] px-3 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                        aria-label="新しいオートメーション デバイス マッピングを作成"
                      >
                        + 新しいオートメーション デバイス マッピング
                      </button>
                    </div>
                  )}

                  {/* デバイスリスト */}
                  <DeviceList state={state} />

                  {/* 接続テストボタン */}
                  {state.mapping.name && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={handleConnect}
                        className="rounded border border-[#4a90d9] bg-[#4a90d9] px-3 py-1 text-[12px] font-semibold text-white hover:brightness-110"
                        aria-label="接続テストを実行する"
                      >
                        接続テスト
                      </button>
                      {state.connectionResult?.ok === true && (
                        <span className="text-[12px] font-semibold text-green-700" role="status">
                          ✓ 接続成功 — オートメーション デバイス: 利用可能
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右: 手順ガイド */}
            <div className="min-w-0 flex-1 overflow-y-auto rounded-lg border border-[#c0c0c0] bg-white/90 p-4 shadow">
              <div className="mb-2 text-[12px] font-semibold text-[#333]">セットアップ手順</div>
              <ol className="space-y-2 text-[12px] text-[#444]">
                <SetupStep
                  n={1}
                  done={state.dasDialog.hostName.trim() !== ''}
                  label="タスクトレイの 🤖 アイコンをクリックして「Desktop Automation サービス」を開く"
                />
                <SetupStep
                  n={2}
                  done={state.dasDialog.hostName.trim() !== ''}
                  label={`「ホスト名」にこの PC のコンピュータ名を入力する`}
                />
                <SetupStep
                  n={3}
                  done={state.dasDialog.singleUserEnabled}
                  label='「☑ シングル ユーザー」をオンにする'
                />
                <SetupStep
                  n={4}
                  done={state.dasDialog.token.trim() !== ''}
                  label='「シングル ユーザー」タブでトークンを入力する（例: DA01）'
                />
                <SetupStep
                  n={5}
                  done={state.dasDialog.savedAndRestarted}
                  label='「保存して再起動」をクリックして設定を反映させる'
                />
                <SetupStep
                  n={6}
                  done={state.mapping.name.trim() !== ''}
                  label='DS の「ファイル → 新しいオートメーション デバイス マッピング」でマッピングを作成する'
                />
                <SetupStep
                  n={7}
                  done={state.connectionResult?.ok === true}
                  label='「接続テスト」で緑（利用可能）になることを確認する（DAS 側と DS 側のトークンが一致すれば成功）'
                />
              </ol>
            </div>
          </div>
        </div>

        {/* Windows 風タスクトレイ */}
        <TrayBar dasServiceStatus={dasStatus} onDasIconClick={handleDasIconClick} />
      </main>

      {/* フェーズ別モーダル（MissionBriefing / DeductionPanel / result） */}
      {phase === 'briefing' && (
        <MissionBriefing mission={mission} onAccept={() => setPhase('deduction')} />
      )}
      {phase === 'deduction' && (
        <DeductionPanel mission={mission} onProceed={() => setPhase('build')} />
      )}
      {phase === 'result' && (
        <SetupResultPanel mission={mission} state={state} hasNext={hasNext} onNext={onNext} />
      )}

      {/* DAS 設定ダイアログ */}
      {showDasDialog && (
        <DasDialog
          hostName={draftHostName}
          singleUserEnabled={draftSingleUser}
          token={draftToken}
          onHostNameChange={setDraftHostName}
          onSingleUserChange={setDraftSingleUser}
          onTokenChange={setDraftToken}
          onSaveRestart={handleSaveRestart}
          onCancel={() => setShowDasDialog(false)}
          restarting={restarting}
        />
      )}

      {/* マッピングダイアログ */}
      {showMappingDialog && (
        <MappingDialog
          name={draftMappingName}
          host={draftMappingHost}
          commandPort={draftMappingPort}
          token={draftMappingToken}
          onNameChange={setDraftMappingName}
          onHostChange={setDraftMappingHost}
          onCommandPortChange={setDraftMappingPort}
          onTokenChange={setDraftMappingToken}
          onAdd={handleAddMapping}
          onCancel={() => setShowMappingDialog(false)}
        />
      )}

      {/* 独立モーダル */}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
      {showProgress && (
        <ProgressMap onClose={() => setShowProgress(false)} onJump={(id) => setMission(id)} />
      )}
      {showHealthRules && <HealthRulesPanel onClose={() => setShowHealthRules(false)} />}
    </div>
  )
}

// ---- 手順ステップ 1 行 ----------------------------------------

function SetupStep({ n, done, label }: { n: number; done: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          done ? 'bg-green-500 text-white' : 'bg-[#ddd] text-[#666]',
        ].join(' ')}
        aria-label={done ? `ステップ ${n}: 完了` : `ステップ ${n}: 未完了`}
      >
        {done ? '✓' : n}
      </span>
      <span className={done ? 'text-[#aaa] line-through' : 'text-[#333]'}>{label}</span>
    </li>
  )
}
