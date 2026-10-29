import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({ define: { 'process.env.NODE_ENV': JSON.stringify('production') }, plugins: [react()], publicDir: false, resolve: { alias: { '@': path.resolve(__dirname, 'src') } }, build: { target: 'es2022', outDir: '.daily-tools-build', emptyOutDir: true, lib: { entry: 'src/daily-tools/index.tsx', name: 'CoffeeLabDailyToolsBundle', formats: ['iife'], fileName: () => 'daily-tools.js', cssFileName: 'daily-tools' } } })
