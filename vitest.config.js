import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import createViteConfig from './vite.config.js'

// vite.config.js 使用函数形式，这里显式调用后再合并测试配置
const viteConfig = createViteConfig({ command: 'build', mode: 'test' })

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
