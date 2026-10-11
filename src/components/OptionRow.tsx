import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface OptionRowProps {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}

/** 截图里「烘焙程度 深烘 ◇」式的行：点开就地展开选项 */
export function OptionRow({ label, value, options, onChange }: OptionRowProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--c-soft)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3.5"
      >
        <span className="text-[15px] text-[var(--c-ink)]">{label}</span>
        <span className="flex items-center gap-1 text-[15px] text-[var(--c-ink-soft)]">
          {value}
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? 'grid-rows-[1fr] pb-3 opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                  opt === value
                    ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]'
                    : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)] active:bg-[var(--c-soft-hover)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
