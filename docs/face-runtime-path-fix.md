# 顔検知素材の404修正

2026-10-21。v2をXRift内で使用した利用者から「顔検知モデルが読み込めませんでした」と報告された。

## 確認できた原因

SDK 0.2.0のWindowsでの`buildUploadFiles`は`path.relative`の結果をURL用の`/`へ変換せず送信していた。
v2の同じCDNで、以下のHEAD応答を確認した。

- `face-assets/wasm/vision_wasm_internal.js`: 404
- `face-assets%5Cwasm%5Cvision_wasm_internal.js`: 200
- `face-assets/face_landmarker.task`: 404
- `face-assets%5Cface_landmarker.task`: 200

ファイルは送信済みだが、ネストしたWindowsのパスが別のオブジェクトキーになっていた。
ローカルプレビューのファイル配信では再現しなかったため、前回の検証では見逃した。

## 修正

- WASM/JSの4ファイルと`truth-face-landmarker.task`を配布ルート直下に置く。
- モデルの準備・実行時URLをフラットな構成に統一。
- `cssCodeSplit: true`で開発プレビュー用CSSを分離し、アイテムの`remoteEntry.js`のCSS読込リストを空にする。ホストのCSPは変更しない。
- ビルド後に5ファイルの存在・モデルハッシュ・アイテム用CSSリストが空であることを検査する。
- CDN反映後は`node scripts/verify-cdn-face.mjs <実際の配布先ディレクトリ>`で、公開先5ファイルの応答と、公開先ランタイム・WASM・モデルを使った実顔検知を確認する。

ローカルでの顔はめ8項目は開発・本番ビルドとも再確認済み。CDNの検証結果は`output/playwright/cdn-face-verification.json`へ保存する。
本人のカメラを取得せず、公開サンプル画像を使う。XRift内の本人のアバターとの位置合わせは利用者による確認対象のまま。
