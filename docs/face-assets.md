# 顔検知の素材

- ランタイム: Google MediaPipe `@mediapipe/tasks-vision` 0.10.17 (Apache-2.0)。パッケージのWASM/JSを`public/face-assets/wasm/`へコピー。配布元のヘッダーを保持する。
- モデル: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- モデルSHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- モデル案内: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- 自動検証用公開画像: https://storage.googleapis.com/mediapipe-assets/portrait.jpg
- 画像SHA-256: `a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e`

モデル・WASMはGitに含めず、`npm run assets:face`で準備する。
検証用画像は`npm run assets:face -- --test-fixture`で取得し、Git対象外の`output/`に保存する。
本人のWebカメラ映像や顔の画像を保存するスクリプトではない。
実行時の推論はローカルで行い、モデルの取得元へカメラ映像を送信しない。
