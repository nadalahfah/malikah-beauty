import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

const copySkinToneModel = {
  name: 'copy-skin-tone-model',
  buildStart() {
    const sourceDir = resolve(projectRoot, 'node_modules/@avatune/skin-tone-predictor/dist/model')
    const targetDir = resolve(projectRoot, 'public/models')

    mkdirSync(targetDir, { recursive: true })
    for (const file of readdirSync(sourceDir, { withFileTypes: true })) {
      if (file.isFile()) {
        copyFileSync(resolve(sourceDir, file.name), resolve(targetDir, file.name))
      }
    }
  },
}

export default defineConfig({
  plugins: [react(), copySkinToneModel],
})
