# boke-aigc

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Sealos CI/CD

仓库已内置 GitHub Actions 工作流 `.github/workflows/sealos-cd.yml`。

当前自动上线流程：

1. `push` 到 `main/master`
2. 只有前端和部署相关文件变更时才触发
3. 先执行 `npm ci`、`npm run type-check`、`npm run build-only`
4. 构建并推送 Docker 镜像到 `ghcr.io/<owner>/<repo>`
5. 自动更新 Sealos 上现有 Deployment

需要配置这些 GitHub 项：

- `Variable: SEALOS_APP_NAME`
- 当前值应与线上 Sealos Deployment 名一致，例如 `boke-aigc-frontend-web`
- `Variable: SEALOS_NAMESPACE`
- 例如 `ns-vd309f0o`
- `Variable: VITE_API_BASE_URL`
- 例如 `https://api.example.com`
- `Secret: SEALOS_KUBECONFIG`
- 值为 Sealos 集群 kubeconfig 原文

安全建议：

- 把 `SEALOS_KUBECONFIG` 从仓库级 Secret 挪到 GitHub `production` environment 的同名 Secret
- 重新生成一份 Sealos kubeconfig 并替换旧值，因为旧值曾暴露
- 尽量使用只允许访问目标 namespace 的 kubeconfig
- GHCR 包保持 `public`，避免在集群里额外保存镜像仓库凭据
