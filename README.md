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

仓库已内置 GitHub Actions 工作流 `.github/workflows/sealos-cd.yml`，默认在 `main/master` push 或 `v*` tag 时：

1. 构建 Docker 镜像
2. 推送到 `ghcr.io/<owner>/<repo>`
3. 如果配置了 `SEALOS_KUBECONFIG`，自动把镜像部署到 Sealos

使用前先在 GitHub 仓库里配置这些项目。

- `Secret: SEALOS_KUBECONFIG`
- 值为 Sealos 集群 kubeconfig 原文
- `Variable: SEALOS_APP_NAME`
- 例如 `boke-aigc-frontend`
- `Variable: SEALOS_NAMESPACE`
- 例如 `prod`
- `Variable: SEALOS_HOST`
- 例如 `aigc.example.com`
- `Variable: VITE_API_BASE_URL`
- 例如 `https://api.example.com`

Sealos 部署模板位于 `deploy/sealos/deployment.yaml.tpl`、`deploy/sealos/service.yaml.tpl`、`deploy/sealos/ingress.yaml.tpl`。

如果 GHCR 镜像保持私有，Sealos 拉镜像会失败。最简单的做法是把该 GitHub Package 改成 `public`。
