## 録音機能 要件定義（初版）

### 目的

ユーザーがブラウザ上で音声を録音し、プレビュー・ダウンロード・アップロード（将来）できるようにする。

### MVP スコープ

- 録音開始/停止
- 経過時間表示
- 録音後の再生（プレビュー）
- ローカルダウンロード（`webm`）
- 失敗時のエラーメッセージ表示

### 非機能要件

- ブラウザ: 最新版の Chrome/Edge/Firefox を想定（Safari は検証対象）
- HTTPS 環境での動作（マイク権限のため）
- アクセシビリティ: ボタンに `aria-label`、状態は視覚的に判別可能

### UI/UX 要件

- 大きな主ボタン（録音開始/停止）
- 説明テキストと経過時間（mm:ss）
- 録音完了後に音声プレーヤーとダウンロードリンク表示
- エラー時は簡潔な説明と再試行案内

### 技術要件

- MediaDevices.getUserMedia（audio）でマイク取得
- MediaRecorder（`audio/webm`）で録音、Blob 生成
- URL.createObjectURL でプレビュー
- Tailwind CSS で簡易スタイル
- TypeScript で型安全に実装

---

## 実装仕様（拡張）

### 追加機能（今回実装）

1. 一時停止/再開
   - webm: `MediaRecorder.pause()/resume()`
   - wav: ScriptProcessorNode でサンプル収集を停止/再開
2. 形式切替
   - `webm`（圧縮、軽量）/ `wav`（非圧縮、編集向け）を UI セレクトで選択
   - 録音中は変更不可（`idle` のみ変更可）
3. 波形表示
   - Web Audio API の `AnalyserNode` + `<canvas>` でリアルタイム波形
   - 2048 FFT サイズ、毎フレーム描画

### 実装詳細

- 共通
  - `RecorderState`: `idle|recording|paused`
  - 経過時間は `performance.now()` 差分で計測、200ms 間隔更新
  - 削除機能: Object URL の `revoke`、バッファ/状態リセット
- webm モード
  - `MediaRecorder` でチャンクを蓄積し、`onstop` で Blob 化
  - 一時停止は `pause()/resume()` を使用
- wav モード
  - `ScriptProcessorNode(4096)` で mono の PCM を収集
  - 停止時に 16-bit PCM へ変換して WAV ヘッダ付与（単一チャンク）
  - 一時停止は収集フラグで制御
- 波形
  - `AnalyserNode` の `getByteTimeDomainData` を用いて描画
  - `requestAnimationFrame` でループ、停止時にキャンセル

### 受け入れ基準（拡張）

1. `webm/wav` いずれでも録音 → 停止で再生・DL 可能
2. 録音中に一時停止 → 再開が機能する
3. 録音中に波形が描画され、停止で描画が止まる
4. 既存の MVP 基準を満たすこと

### 将来拡張（次フェーズ）

- 一時停止/再開、再録音
- 波形/レベルメーター可視化（Web Audio API）
- 形式選択（`wav` / `webm`）
- サーバーアップロード（署名 URL、再送リトライ）
- デバイス選択、ノイズ抑制・AGC トグル

### 受け入れ基準（MVP）

1. 録音開始後に経過時間が増分表示されること
2. 停止で音声が再生可能になり、ダウンロードできること
3. マイク拒否時にエラー表示が出ること
4. Lint/Typecheck/Build が CI で成功すること
