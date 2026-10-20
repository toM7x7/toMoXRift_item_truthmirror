# 真実の鏡 — XRiftアイテム

PCのWebカメラ映像を、操作した本人の画面内の鏡にだけ表示するXRiftアイテム試作。
映像を送信・同期・録画・保存するコードはない。音声トラックも取得しない。
通常のワールド反射ではなく、停止時は案内画面、起動時は実写の映像面になる。

GitHub: https://github.com/toM7x7/toMoXRift_item_truthmirror

XRift v1は審査通過・有効化済み。2026-10-20、利用者からXRift内での実カメラ映像の表示確認が報告された。
これは利用者による実機確認であり、自動検証の模擬カメラとは別の記録。

## 試す

```powershell
git clone https://github.com/toM7x7/toMoXRift_item_truthmirror.git
cd toMoXRift_item_truthmirror
npm ci
npm run dev
```

http://127.0.0.1:5193/ をPCのChrome / Edgeで開く。
鏡の「真実を見る」または右の「カメラを許可して映す」を押し、ブラウザのカメラ許可を選ぶ。
開始操作をするまではカメラを取得しない。ドラッグで視点回転、ホイールで拡大できる。
縦横比を維持して中央を縦長に切り出し、左右反転する。顔だけの自動検出・背景除去はしない。

停止ボタン、タブ非表示、ページ離脱、アイテムのアンマウントで全トラックを停止し、動画とテクスチャを解放する。
タブに戻っても自動再開しない。許可待ちを取り消した後に取得できたストリームも直ちに停止する。
ブラウザ自身の許可ダイアログはコードから閉じられない。残っている場合はブラウザ側で閉じる。
未解決のカメラ許可リクエストがある間は、二重に取得を要求しない。

## 構成

- `src/Item.tsx`: XRift向けItemエクスポートと、鏡・3D操作ボタン。
- `src/useLocalCamera.ts`: カメラ取得と解放、許可拒否の案内、競合する非同期要求の破棄。
- `src/dev.tsx`: ローカル試作用の画面と3Dボタンのクリック判定。
- `src/preview-sdk.ts`: 開発時だけSDKの必要なモジュールを直接読み、SDK barrelのフォント事前取得を避ける。
- `vite.config.ts`: 本番ビルドでは通常のプラットフォーム共有SDKを使い、`./Item`を公開する。
- `xrift.json`: 日本語メタデータとカメラアクセス用`no-navigator-access`宣言。外部通信の権限は宣言しない。

## 検証

```powershell
npm run typecheck
npm run build
npx @xrift/cli@latest check item --json
npx playwright install chromium
npm run verify:browser
```

ブラウザ検証用Playwrightはこのリポジトリの開発依存に含む。既定Chromiumがない環境では、
`TRUTH_MIRROR_CHROME`環境変数に手元のChrome/Chromiumの実行ファイルパスを設定する。
検証スクリプトは実カメラの代わりにChromiumの模擬映像を使う。

検証結果・画面: `output/playwright/verification.json`, `idle.png`, `fake-camera.png`（生成物はGit対象外）。
v1の自動検証記録は `docs/verification-v1.json`。実写画像はリポジトリに含めない。
タブ非表示はvisibilitychangeの合成イベントによる停止処理の検証。実ブラウザのタブ切替は手動確認対象。

## 残る確認

- 実Webカメラの表示は利用者が確認済み。色・明るさ・遅延の定量評価は未実施。
- 異なるPC・ブラウザでのカメラ権限や表示の再現性。
- 本番プラットフォーム自体の通信は、本アイテムのローカル映像処理とは別。
- Quest、複数カメラ選択、顔だけの合成、一般向けMarketplace公開は未実施。

プレビューは床と置き鏡の外観確認用で、歩行・衝突の確認環境ではない。

## XRiftアップロード (2026-10-20)

- アイテムID: `07f39dd8-e59e-44a7-9d5b-da04a1e9d8d4`
- バージョン: 1
- アップロード: 2026-10-20 23:18:46 JST (`.xrift/item.json`)
- 詳細: https://app.xrift.net/my-items/07f39dd8-e59e-44a7-9d5b-da04a1e9d8d4
- 型チェック成功。公式CLIアップロード内のビルド・セキュリティ検査も成功。実プレビューの512x512サムネイルを同梱。
- 本人のXRiftマイアイテム一覧で「有効」、詳細画面でv1「現在使用中」「審査通過」を確認。
- 確認画面: `output/playwright/xrift-upload-approved.png`。
- APIでの状態取得は404/401だったため、最終的な状態はログイン済みブラウザの表示で確認した。
- 既存の4装備スロットは変更していない。試す際は1枠を入れ替えて装備し、ワールド内で配置する。
- このv1アップロード時点ではGitHub未反映。その後、指定のGitHubリポジトリへソースを同期。
- XRift内の映像表示は利用者確認済み。複数配置での独立動作は未検証。

## 同じXRiftアイテムを更新する

`.xrift/item.json` は公開可能なアイテムIDと日時だけを含み、Gitで管理する。
削除すると新しいアイテムが作成される可能性があるため、更新時は保持する。
認証情報はこのファイルに含まれず、各PCで公式CLIへログインする。

```powershell
npx @xrift/cli@latest whoami
npm run typecheck
npx @xrift/cli@latest upload item
```

実装・ビルド済みのv1と、未実装の[顔検知・顔はめ案](docs/face-overlay-proposal.md)は区別する。
