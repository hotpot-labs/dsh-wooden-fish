/**
 * dsh-wooden-fish 浏览器端入口。
 *
 * 两个 slot 贡献：
 * 1. `conversation.session.header.utilities`：在会话头部（顶部右侧、
 *    Session log 下载按钮左边）放一个「木鱼」切换按钮，点击显示/收起木鱼。
 * 2. `shell.overlay`：全屏浮层。收起时不渲染任何内容；展开时以**透明背景**
 *    居中展示木鱼与木锤，木鱼下方带一个隐藏（收起）图标按钮。
 *
 * 点击木鱼时木锤敲击一下，顶部弹出「功德 +1」，播放 wooden-fish.m4a 敲击声，
 * 用 Web Speech API 播报「南无阿弥陀佛」。木鱼、木锤与顶部功德记录颜色跟随
 * 应用外观色：浅色外观为黑色、深色外观为白色。
 */
import * as React from 'react'

import knockSoundBase64 from './wooden-fish.m4a'

// esbuild 以 base64 字符串内联 m4a，这里拼成带正确 MIME 的 data URL，
// 浏览器才能把它当作音频解码（而不是 application/octet-stream）。
const knockSoundUrl = `data:audio/mp4;base64,${knockSoundBase64}`

const PLUGIN_NAME = 'dsh-wooden-fish'

/** 单个「功德 +1」气泡：唯一 id 加上用于散开的水平偏移。 */
interface MeritPopup {
  id: number
  dx: number
}

/**
 * 木鱼显隐状态：模块级最小 store，供头部切换按钮与浮层两个 slot 共享。
 * `useSyncExternalStore` 订阅它，getSnapshot 返回原始布尔值。
 */
const fishStore = {
  shown: false,
  listeners: new Set<() => void>(),
  getSnapshot: () => fishStore.shown,
  subscribe: (listener: () => void) => {
    fishStore.listeners.add(listener)
    return () => { fishStore.listeners.delete(listener) }
  },
  setShown: (next: boolean) => {
    if (fishStore.shown === next) return
    fishStore.shown = next
    for (const listener of [...fishStore.listeners]) listener()
  },
}

/** 订阅木鱼显隐状态的 hook。 */
function useFishShown(): boolean {
  return React.useSyncExternalStore(fishStore.subscribe, fishStore.getSnapshot, fishStore.getSnapshot)
}

let knockAudio: HTMLAudioElement | null = null

/**
 * 播放 wooden-fish.m4a 敲击声。复用单个 `<audio>` 元素，连续点击时先把
 * 播放进度归零，保证快速连击也能从头播放。
 */
function playKnock(): void {
  knockAudio ??= new Audio(knockSoundUrl)
  knockAudio.currentTime = 0
  knockAudio.play().catch(() => {
    // 浏览器自动播放策略拦截时静默失败，不阻断敲击动画。
  })
}

/**
 * 用 Web Speech API 播报「南无阿弥陀佛」。
 */
function speakMerit(): void {
  try {
    const synthesis = window.speechSynthesis
    if (synthesis === undefined) return
    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('南无阿弥陀佛')
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    synthesis.speak(utterance)
  } catch {
    // 无可用语音引擎时静默失败。
  }
}

/**
 * 插件样式表：浮层、木鱼/木锤、敲击与气泡动画、头部切换按钮、隐藏按钮。
 * 由 {@link installStyles} 以一个 `<style>` 元素注入，卸载时移除。
 * 展开时背景为透明（不再使用 backdrop-filter 虚化）。
 */
const STYLES = `
.dwf-stage {
  position: fixed;
  inset: 0;
  z-index: 9990;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 主色：默认浅色外观为黑色，深色外观为白色。 */
  --dwf-ink: #000000;
  /* 反色：主色的补色，供功德记录等反衬背景使用。 */
  --dwf-ink-inverse: #ffffff;
}
body[data-ds-dark-theme] .dwf-stage {
  --dwf-ink: #ffffff;
  --dwf-ink-inverse: #000000;
}
.dwf-board {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.dwf-board:active {
  cursor: grabbing;
}
.dwf-scene {
  position: relative;
  width: 400px;
  height: 320px;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.dwf-scene:active {
  transform: scale(0.98);
}
.dwf-mallet {
  position: absolute;
  /* 木鱼宽 250px、水平居中，右边缘在 50% + 125px；木锤放在其右 5px 处。 */
  left: calc(50% + 130px);
  bottom: 26px;
  width: 46px;
  height: 190px;
  transform-origin: 23px 182px;
  transform: rotate(28deg);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.35));
}
.dwf-mallet--strike {
  animation: dwf-strike 0.42s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}
.dwf-fish {
  position: absolute;
  left: 50%;
  bottom: 26px;
  width: 250px;
  height: 188px;
  transform: translateX(-50%);
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.35));
}
.dwf-fish--hit {
  animation: dwf-fish-hit 0.42s ease both;
}
.dwf-fish-shape,
.dwf-mallet-head,
.dwf-mallet-handle {
  fill: var(--dwf-ink);
}
.dwf-hide {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-top: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.16s, color 0.16s;
}
.dwf-hide:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dwf-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 6px 12px;
  gap: 4px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 18px;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  cursor: pointer;
}
.dwf-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dwf-toggle--active {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dwf-toggle span,
.dwf-toggle svg {
  flex: none;
}
.dwf-toggle span {
  white-space: nowrap;
}
.dwf-merit {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  line-height: 1;
  color: var(--dwf-ink);
  background: var(--dwf-ink-inverse);
  border: 1px solid var(--dwf-ink);
  border-radius: 999px;
  padding: 8px 18px;
  letter-spacing: 1px;
  pointer-events: none;
}
.dwf-popup {
  /* 相对木鱼整体（.dwf-board）定位，随木鱼拖动一起移动，从木鱼上方冒出。 */
  position: absolute;
  top: 10px;
  font-size: 26px;
  font-weight: 700;
  color: var(--dwf-ink);
  text-shadow: 0 2px 8px var(--dwf-ink-inverse);
  animation: dwf-pop 1.5s ease-out forwards;
  pointer-events: none;
  white-space: nowrap;
}
@keyframes dwf-strike {
  0% { transform: rotate(28deg); }
  38% { transform: rotate(-14deg); }
  55% { transform: rotate(-6deg); }
  100% { transform: rotate(28deg); }
}
@keyframes dwf-fish-hit {
  0% { transform: translateX(-50%) scale(1); }
  35% { transform: translateX(-50%) scale(0.94, 0.92); }
  100% { transform: translateX(-50%) scale(1); }
}
@keyframes dwf-pop {
  0% { opacity: 0; transform: translate(-50%, 52px) scale(0.7); }
  16% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
  26% { transform: translate(-50%, -8px) scale(1); }
  70% { opacity: 1; transform: translate(-50%, -52px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -96px) scale(0.9); }
}
`

/**
 * 注入样式表；返回销毁函数，插件卸载时移除。
 */
function installStyles(): () => void {
  // 非浏览器运行（以 node 启动客户端树）没有 document。
  if (typeof document === 'undefined') return () => {}
  const style = document.createElement('style')
  style.setAttribute('data-dsh-wooden-fish', '')
  style.textContent = STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}

/**
 * 头部「木鱼」切换按钮：位于 Session log 下载按钮左侧，点击展开/收起木鱼。
 * 不消费任何 session 作用域 props，忽略 slot 注入的标准席位。
 */
function FishToggleButton(): JSX.Element {
  const shown = useFishShown()
  return (
    <button
      type="button"
      className={'dwf-toggle' + (shown ? ' dwf-toggle--active' : '')}
      aria-pressed={shown}
      aria-label="展示 / 收起木鱼"
      onClick={() => { fishStore.setShown(!shown) }}
    >
      <svg className="dwf-toggle-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="9.2" r="5.6" fill="currentColor" />
        <path d="M4.6 8.6 Q8 5.4 11.4 8.6" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      <span>木鱼</span>
    </button>
  )
}

/**
 * 全屏浮层组件：展开时渲染木鱼、木锤、隐藏按钮、功德计数与「功德 +1」气泡；
 * 收起时返回 null（不渲染任何浮层内容）。
 */
function WoodenFishOverlay(): JSX.Element | null {
  const shown = useFishShown()
  const [strike, setStrike] = React.useState(0)
  const [merit, setMerit] = React.useState(0)
  const [popups, setPopups] = React.useState<MeritPopup[]>([])
  const idRef = React.useRef(0)
  // 每个「功德 +1」气泡的自动移除定时器，便于统一清理。
  const timersRef = React.useRef<Set<number>>(new Set())
  // 木鱼整体（木鱼 + 木锤 + 隐藏按钮）相对居中的拖拽偏移。
  const [pos, setPos] = React.useState({ x: 0, y: 0 })
  // 拖拽过程记录：起始指针位置、起始偏移、是否已产生位移。
  const dragRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  // 拖拽结束后抑制紧随其后的 click，避免拖拽误触发敲击/收起。
  const suppressClickRef = React.useRef(false)

  const handleStrike = React.useCallback(() => {
    // 拖拽结束后的 click 不算敲击。
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setStrike((count) => count + 1)
    setMerit((count) => count + 1)
    const id = idRef.current++
    // 给每个气泡一个小的水平偏移，连续点击时彼此错开。
    const dx = Math.round((Math.random() - 0.5) * 80)
    setPopups((list) => [...list, { id, dx }])
    playKnock()
    // speakMerit()
    // 每个气泡独立计时移除，连续敲击时不会互相取消定时器。
    const timer = window.setTimeout(() => {
      setPopups((list) => list.filter((popup) => popup.id !== id))
      timersRef.current.delete(timer)
    }, 1500)
    timersRef.current.add(timer)
  }, [])

  const handleBoardPointerDown = (event: React.PointerEvent): void => {
    suppressClickRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    }
  }

  // 在 window 上监听 move/up，指针移出木鱼区域也不会中断拖拽。
  React.useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (drag === null || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      // 超过小阈值才算拖拽，避免把点击的轻微抖动当成拖动。
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
      if (drag.moved) setPos({ x: drag.originX + dx, y: drag.originY + dy })
    }
    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (drag === null || drag.pointerId !== event.pointerId) return
      if (drag.moved) suppressClickRef.current = true
      dragRef.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [])

  // 收起木鱼时清掉残留气泡与定时器，并复位敲击态，避免再次显示时
  // 冒出一堆「功德 +1」或重放敲击动画。
  React.useEffect(() => {
    if (shown) return
    for (const timer of timersRef.current) window.clearTimeout(timer)
    timersRef.current.clear()
    setPopups([])
    setStrike(0)
  }, [shown])

  React.useEffect(() => {
    return () => {
      for (const timer of timersRef.current) window.clearTimeout(timer)
      timersRef.current.clear()
    }
  }, [])

  if (!shown) return null

  const striking = strike > 0
  return (
    <div className="dwf-stage">
      <div
        className="dwf-board"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onPointerDown={handleBoardPointerDown}
      >
        <div className="dwf-scene" onClick={handleStrike} role="button" aria-label="敲击木鱼">
        <svg
          key={`mallet-${strike}`}
          className={'dwf-mallet' + (striking ? ' dwf-mallet--strike' : '')}
          viewBox="0 0 48 200"
          width="46"
          height="190"
          aria-hidden="true"
        >
          {/* 顶部圆球为正圆，木锤杆上下等宽、底部圆角。 */}
          <circle className="dwf-mallet-head" cx="24" cy="24" r="24" />
          <path className="dwf-mallet-handle" d="M18 46 L30 46 L30 186 Q30 192 24 192 Q18 192 18 186 Z" />
        </svg>
        <svg
          key={`fish-${strike}`}
          className={'dwf-fish' + (striking ? ' dwf-fish--hit' : '')}
          viewBox="0 0 1365 1024"
          width="250"
          height="188"
          aria-hidden="true"
        >
          <path
            className="dwf-fish-shape"
            d="M1.450653 780.39695c-10.175905 64.255398 36.031662 101.161718 59.626108 112.361614 23.594445 11.178562 63.274073 0 78.825927 0 116.542907 11.178562 366.759228 131.220103 678.606972 131.220103 0 0 504.635269 7.445264 543.31224-360.487287 9.19458-95.529771 4.885288-277.458732-71.039334-286.162651-63.956734-8.426588-102.121709 4.074628-183.315615 20.565141-53.908828 10.922564-189.011561 29.973052-212.926004 44.970245-260.989553 118.718887-403.324219 204.371417-442.299853 217.128631-29.439724 0-54.975485-7.359931-62.100752-69.972677 0-25.706426 98.089747-87.039184 140.137353-96.959091C682.660267 452.869354 796.365867 435.333519 809.720409 435.333519c19.263819 0 441.489194-101.588381 454.438406-111.188291 12.949212-9.59991 26.62375-18.986489 26.623751-52.543508 0-15.359856-33.813016-49.663534-72.319322-91.455142-45.674238-49.556869-99.94573-107.092329-140.606682-120.788201C1002.934597 20.958737 856.077308-10.912964 727.779844 3.572233 446.929143 35.273269 271.677453 342.662388 256.424263 363.995521c-64.852725 90.708483-116.542907 205.587406-143.678653 256.296264C86.548522 669.272659 11.71189 735.149375 1.450653 780.39695z"
          />
        </svg>
      </div>
      <button
        type="button"
        className="dwf-hide"
        aria-label="收起木鱼"
        title="收起木鱼"
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
          }
          fishStore.setShown(false)
        }}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M2 8s2-3.5 6-3.5S14 8 14 8s-2 3.5-6 3.5S2 8 2 8Z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="1.6" fill="currentColor" />
          <line x1="3.2" y1="12.8" x2="12.8" y2="3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
        {popups.map((popup) => (
          <div className="dwf-popup" key={popup.id} style={{ left: `calc(50% + ${popup.dx}px)` }}>
            功德 +1
          </div>
        ))}
      </div>
      <div className="dwf-merit">功德 {merit}</div>
    </div>
  )
}

export const name = PLUGIN_NAME

export const inject = ['slots'] as const

interface SlotDefinition {
  name: string
  id: string
  order: number
}

interface SlotsService {
  inject: (slot: string, factory: () => () => void) => void
  register: (def: SlotDefinition, component: React.ComponentType) => () => void
}

interface Context {
  effect: (dispose: () => void, id?: string) => void
  slots: SlotsService
}

/**
 * 注入样式，并注册两个 slot 贡献：
 * - `shell.overlay`：全屏透明浮层（木鱼 + 木锤 + 隐藏按钮）。
 * - `conversation.session.header.utilities`：顶部右侧「木鱼」切换按钮，
 *   用 order -100 排到 Session log（order 0）下载按钮左侧。
 * @param ctx - Cordis client context。
 */
export function apply(ctx: Context): void {
  ctx.effect(installStyles, 'dsh-wooden-fish: styles')
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'dsh-wooden-fish',
        order: 0,
      },
      WoodenFishOverlay,
    ),
  )
  ctx.slots.inject('conversation.session.header.utilities', () =>
    ctx.slots.register(
      {
        name: 'conversation.session.header.utilities',
        id: 'dsh-wooden-fish-toggle',
        order: -100,
      },
      FishToggleButton,
    ),
  )
}
