/**
 * dsh-wooden-fish host 侧入口。
 *
 * 本插件的全部功能都在浏览器端（client entry），host 侧无需任何服务
 * 或 RPC channel，这里仅提供 bundle 解析所需的空入口。
 */
export const name = 'dsh-wooden-fish'

/**
 * @param _ctx - Cordis host context（未使用）。
 */
export function apply(_ctx: unknown): void {}
