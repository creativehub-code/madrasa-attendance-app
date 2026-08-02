'use client';

interface QuickChip {
  label: string;
  value: number;
}

interface StepperFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  quickChips?: QuickChip[];
}

export function formatFraction(val: number): string {
  if (val === 0) return '0';
  const integerPart = Math.floor(val);
  const remainder = Math.round((val - integerPart) * 100) / 100;

  let fractionStr = '';
  if (Math.abs(remainder - 0.25) < 0.01) fractionStr = '¼';
  else if (Math.abs(remainder - 0.5) < 0.01) fractionStr = '½';
  else if (Math.abs(remainder - 0.75) < 0.01) fractionStr = '¾';

  if (integerPart === 0) {
    return fractionStr || String(val);
  }
  return fractionStr ? `${integerPart} ${fractionStr}` : String(integerPart);
}

export default function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
  quickChips,
}: StepperFieldProps) {
  const decrement = () => {
    const nextVal = Math.round((value - step) * 100) / 100;
    onChange(Math.max(min, nextVal));
  };

  const increment = () => {
    const nextVal = Math.round((value + step) * 100) / 100;
    onChange(Math.min(max, nextVal));
  };

  const formattedDisplay = formatFraction(value);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label || 'value'}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-xl font-bold text-madrasa-700 dark:text-emerald-400 shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[4rem] text-center text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {formattedDisplay}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label || 'value'}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-xl font-bold text-madrasa-700 dark:text-emerald-400 shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* Quick Select Chips */}
      {quickChips && quickChips.length > 0 && (
        <div className="flex items-center gap-1 pt-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-0.5">Quick:</span>
          {quickChips.map((chip) => {
            const isActive = Math.abs(value - chip.value) < 0.01;
            return (
              <button
                key={chip.label}
                type="button"
                disabled={disabled}
                onClick={() => onChange(chip.value)}
                className={`flex-1 rounded-lg py-1 px-1.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? 'bg-madrasa-700 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
