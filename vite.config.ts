import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
    federation({
      name: 'xrift_truth_mirror',
      filename: 'remoteEntry.js',
      exposes: {
        './Item': './src/index.tsx',
      },
      // shared は必ずホストが提供する実体を使う。
      // requiredVersion に狭い範囲を書くと、ホストが更新された時点で
      // アイテム同梱の __federation_shared_*.js へフォールバックするが、
      // その共有チャンクは配信されないためアイテムごと読み込めなくなる。
      // strictVersion は生成される実行時コードから参照されないので効かない。
      shared: {
        react: {
          singleton: true,
          requiredVersion: '*',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '*',
        },
        'react-dom/client': {
          singleton: true,
        },
        'react/jsx-runtime': {
          singleton: true,
        },
        three: {
          singleton: true,
          requiredVersion: '*',
        },
        'three/addons/loaders/DRACOLoader.js': {
          singleton: true,
          version: '0.0.0',
        },
        '@react-three/fiber': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/rapier': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/drei': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/uikit': {
          singleton: true,
          requiredVersion: '*',
        },
        '@pmndrs/uikit': {
          singleton: true,
          requiredVersion: '*',
        },
        '@xrift/world-components': {
          singleton: true,
          requiredVersion: '*',
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    // The exposed Item has no CSS. Keep the standalone preview's stylesheet
    // out of the remote's dynamicLoadingCss list (host style-src blocks it).
    cssCodeSplit: true,
    assetsDir: '',
  },
  resolve: {
    alias: [
      { find: '~', replacement: path.resolve(__dirname, './src') },
      // Development only: skip the SDK barrel's global font prefetch.
      ...(command === 'serve' ? [{ find: /^@xrift\/world-components$/, replacement: path.resolve(__dirname, './src/preview-sdk.ts') }] : []),
    ],
  },
  define: {
    global: 'globalThis',
  },
}))
