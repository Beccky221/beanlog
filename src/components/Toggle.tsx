interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

/** iOS 风格开关 */
export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-[46px] h-[28px] rounded-full transition-colors duration-200 shrink-0 ${
        checked ? 'bg-[var(--c-toggle-on)]' : 'bg-[var(--c-tint)]'
      }`}
    >
      <span
        className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all duration-200 ${
          checked ? 'left-[21px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}
