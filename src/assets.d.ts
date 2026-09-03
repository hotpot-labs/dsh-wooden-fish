/** 让 TypeScript 识别音频资源导入（esbuild 以 base64 字符串内联）。 */
declare module '*.m4a' {
  const base64: string
  export default base64
}
