# 真実の鏡 — XRiftアイテム

PCのWebカメラ映像を、操作した本人の画面内の鏡にだけ表示するXRiftアイテム試作。
映像を送信・同期・録画・保存するコードはない。音声トラックも取得しない。
全面カメラモードは、停止時に案内画面、起動時に実写の映像面になる。
追加の顔はめ試作モードは通常の鏡像を背景に、実写の顔だけを重ねる。

GitHub: https://github.com/toM7x7/toMoXRift_item_truthmirror

XRift v1は審査通過・有効化済み。2026-10-20、利用者からXRift内での実カメラ映像の表示確認が報告された。
これは利用者による実機確認であり、自動検証の模擬カメラとは別の記録。

## 試す

```powershell
git clone https://github.com/toM7x7/toMoXRift_item_truthmirror.git
cd toMoXRift_item_truthmirror
npm ci
npm run assets:face
npm run dev
```

http://127.0.0.1:5193/ をPCのChrome / Edgeで開く。
鏡の「真実を見る」または右の「カメラを許可して映す」を押し、ブラウザのカメラ許可を選ぶ。
開始操作をするまではカメラを取得しない。ドラッグで視点回転、ホイールで拡大できる。
全面カメラモードでは縦横比を維持して中央を縦長に切り出し、左右反転する。

停止ボタン、タブ非表示、ページ離脱、アイテムのアンマウントで全トラックを停止し、動画とテクスチャを解放する。
タブに戻っても自動再開しない。許可待ちを取り消した後に取得できたストリームも直ちに停止する。
ブラウザ自身の許可ダイアログはコードから閉じられない。残っている場合はブラウザ側で閉じる。
未解決のカメラ許可リクエストがある間は、二重に取得を要求しない。

## 構成

- `src/Item.tsx`: XRift向けItemエクスポートと、鏡・3D操作ボタン。
- `src/useLocalCamera.ts`: カメラ取得と解放、許可拒否の案内、競合する非同期要求の破棄。
- `src/useFaceCutout.ts`, `src/faceCutout.ts`: MediaPipeの顔輪郭検出と、透明背景の実写切り抜き。
- `src/FaceMirror.tsx`: 通常の反射と、手動で位置合わせする鏡面上の実写合成。
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
- Quest、複数カメラ選択、一般向けMarketplace公開は未実施。
- 顔はめのローカル試作は下記の範囲で実装・検証済み。XRift本番での顔はめは未検証。

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

## 正面・固定位置の顔はめ試作

http://127.0.0.1:5193/?mode=face を開く（または「顔はめ試作」を押す）。
カメラを許可し、正面から顔が検出されると、顔輪郭の実写が鏡面の固定位置に現れる。
「左右」「上下」「大きさ」で反射したアバターの顔に合わせる。
位置合わせの枠を表示でき、リセットも可能。値はこの鏡のローカル状態で、保存や同期はしない。
足元の目印から外れたり、正面を向いていなかったりする場合は合成を隠す。
ローカル画面の「一歩横へ移動して確認」でこの動作も試せる。

ローカル画面の体は検証用の簡易アバターで、本人のVRMではない。
XRiftの実ワールドでは純正`Mirror`がその場のアバター・背景を反射する構成。
鏡前の目印（アイテム原点から前方1.6m）に立ち、正面視点を固定して位置合わせする想定。
アイテム内にもモード切替と左右・上下・大小・枠・リセットの3Dボタンを用意している。

顔は輪郭に沿って切り抜き、透明な領域からは元の髪・体・背景が見える。
アバターのVRM・マテリアル・ボーンは変更しない。
検出が0件または2件なら実写を隠す（検出器が見落とす顔までは判別できない）。
動画はPC内で処理し、同梱モデルとWASMを使用する。[素材の取得元・ハッシュ](docs/face-assets.md)。

```powershell
npm run assets:face -- --test-fixture
npm run verify:face
```

検証用の公開顔写真を映像入力に置き換え、実際のモデルで検出・切り抜き・鏡像への合成を確認する。
結果は`output/playwright/face-verification.json`と画面キャプチャへ保存。
写真を使うのはこの検証スクリプトだけで、通常のアプリでは本人が許可したカメラを使用する。
モデルは最大10回/秒を目安にメインスレッドで同期推論する試作。Worker化と低性能PCでの性能検証は未実施。
自由移動・首振り・しゃがみへの追従、髪や手の前後関係、本人の実カメラとXRiftの実アバターでの顔はめは未確認。

顔はめ版は同じアイテムIDのv2として2026-10-21 00:04 JSTにアップロード済み。[アップロード記録](docs/xrift-face-v2.md)。
モデル読込404と不要なCSS読込を修正したv3を追加。[原因と修正・配信先検証](docs/face-runtime-path-fix.md)。
[実装と検証記録](docs/fixed-face-prototype.md)、[試作方針と未確認点](docs/face-overlay-proposal.md)。
