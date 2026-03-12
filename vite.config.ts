import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pipelineAuthorization = env.PIPELINE_AUTHORIZATION?.trim()

  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api/pipeline': {
          target: 'https://ai.blue-converse.com',
          changeOrigin: true,
          headers: pipelineAuthorization ? { Authorization: pipelineAuthorization } : undefined,
          rewrite: (path) => path.replace(/^\/api\/pipeline/, '/api'),
        },
      },
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/element-plus') || id.includes('node_modules/@element-plus')) {
              return 'vendor-element'
            }
            if (id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
              return 'vendor-vue'
            }
            if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
              return 'vendor-core'
            }
          }
        },
      },
    },
  }
})
