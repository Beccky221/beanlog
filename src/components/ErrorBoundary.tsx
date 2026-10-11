import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 兜底错误边界：任何渲染异常都别变成白屏。
 * 数据都在本机，所以这里给的是「重试」和「提示导出备份」，而不是刷新页面了事。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('界面出错了：', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="h-dvh bg-[var(--c-bg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 shadow-[0_10px_30px_rgb(var(--c-shadow)/0.12)]">
          <div className="flex items-center gap-2 text-[var(--c-danger)]">
            <AlertTriangle size={18} />
            <p className="text-[15px] font-semibold">界面出了点问题</p>
          </div>
          <p className="text-[12.5px] text-[var(--c-ink-soft)] mt-2 leading-relaxed">
            你的豆子数据还在本机，没有丢。可以先重试；如果一直打不开，
            请到「我的 → 数据管理」导出备份后再清理浏览器数据。
          </p>
          <p className="text-[11.5px] text-[var(--c-ink-ghost)] mt-2 break-all">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 w-full h-11 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[14px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <RotateCw size={15} /> 重试
          </button>
        </div>
      </div>
    )
  }
}
