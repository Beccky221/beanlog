import { Star } from 'lucide-react'

interface StarsProps {
  value: number
  onChange?: (v: number) => void
  size?: number
}

export function Stars({ value, onChange, size = 16 }: StarsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? 0 : n)}
          className={onChange ? 'p-0.5 active:scale-90 transition-transform' : 'p-0.5 cursor-default'}
          aria-label={`${n} 星`}
        >
          <Star
            size={size}
            className={
              n <= value ? 'fill-[var(--c-star)] text-[var(--c-star)]' : 'fill-[var(--c-soft-hover)] text-[var(--c-soft-hover)]'
            }
          />
        </button>
      ))}
    </div>
  )
}
