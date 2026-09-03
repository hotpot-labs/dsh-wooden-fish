# dsh-wooden-fish

[English](README.md) | 中文

一个 DSH（DeepSeek Harness）Web 模式插件：在页面中央展示木鱼与木锤，背景虚化透出下方的 dsh web 界面。点击木鱼，木锤敲击一下，顶部弹出「功德 +1」，并播报「南无阿弥陀佛」。

![预览](.github/assets/preview.png)

## 安装

### 从 npm 安装（推荐）

```sh
dsh plugin --profile web add dsh-wooden-fish
```

### 从 GitHub 安装

```sh
dsh plugin --profile web add github:your-org/dsh-wooden-fish
```

pnpm ≥10 默认禁止 git 依赖执行构建脚本。首次 `add` 失败后，在对应 profile 的 `pnpm-workspace.yaml` 中授权本包构建，然后重新执行上面的 `add` 命令：

```yaml
allowBuilds:
  dsh-wooden-fish: true
```

### 本地安装

在包含本插件的目录中，把它作为本地 bundle 安装进 profile：

```sh
dsh plugin --profile web add ./dsh-wooden-fish
```

## 使用

安装完成后以 web 模式启动：

```sh
dsh --profile web web
```

页面中央会出现木鱼与木锤，背景为虚化的 dsh web 界面。点击木鱼即可敲击。

## 功能特性

- 通过 `shell.overlay` slot 在 dsh web 模式中居中渲染木鱼与木锤。
- 用 `backdrop-filter` 虚化背景，下方的 dsh web 界面保持可点击穿透。
- 点击后木锤敲击一下，顶部弹出「功德 +1」，累计功德数递增。
- 播放 `wooden-fish.m4a` 敲击声，并用 Web Speech API 播报「南无阿弥陀佛」。
- 木鱼、木锤与功德记录颜色跟随应用外观：浅色外观为黑色，深色外观为白色。

## 开发

本插件为纯客户端插件：host 入口（`src/index.ts`）是空的 bundle 占位，全部功能在浏览器入口（`src/client.tsx`）中。使用 esbuild 构建：

```sh
npm install
npm run build
npm run typecheck
```

## 常见问题

- **点击没有声音 / 没有语音？** 浏览器需要用户手势才能解锁音频；`speechSynthesis` 依赖操作系统/浏览器中安装了中文语音。点击木鱼本身就是手势，如果仍无语音，请在系统设置中安装中文（`zh-CN`）语音包。
- **如何隐藏浮层？** 停止或卸载插件即可；插件没有页面内的开关。
