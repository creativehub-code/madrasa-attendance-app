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
  isWrong?: boolean;
  onToggleWrong?: () => void;
  isNotGiven?: boolean;
  onToggleNotGiven?: () => void;
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
  isWrong = false,
  onToggleWrong,
  isNotGiven = false,
  onToggleNotGiven,
}: StepperFieldProps) {
  const isLocked = disabled || isWrong || isNotGiven;

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
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </span>
        )}
        {onToggleWrong && (
          <button
            type="button"
            onClick={onToggleWrong}
            title={isWrong ? "Marked as wrong (Locked). Click to unlock." : "Mark lesson as wrong (resets value to 0 & locks field)"}
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold transition active:scale-95 border ${
              isWrong
                ? 'bg-red-600 text-white border-red-700 shadow-xs ring-2 ring-red-300 dark:ring-red-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/50'
            }`}
          >
            <span aria-hidden="true">❌</span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold">{isWrong ? 'Wrong (Locked)' : 'Wrong'}</span>
          </button>
        )}
        {onToggleNotGiven && (
          <button
            type="button"
            onClick={onToggleNotGiven}
            title={isNotGiven ? "Marked as Not Given (Locked). Click to unlock." : "Mark lesson as Not Given (resets value to 0 & locks field)"}
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold transition active:scale-95 border ${
              isNotGiven
                ? 'bg-orange-600 text-white border-orange-700 shadow-xs ring-2 ring-orange-300 dark:ring-orange-800'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/50'
            }`}
          >
            <span aria-hidden="true">🚫</span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold">{isNotGiven ? 'Not Given (Locked)' : 'Not Given'}</span>
          </button>
        )}
      </div>

      <div className={`flex items-center justify-between gap-1 rounded-xl border p-1 transition-colors ${
        isWrong
          ? 'border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/30'
          : isNotGiven
          ? 'border-orange-300 bg-orange-50/50 dark:border-orange-900/60 dark:bg-orange-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}>
        <button
          type="button"
          onClick={decrement}
          disabled={isLocked || value <= min}
          aria-label={`Decrease ${label || 'value'}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-xl font-bold text-madrasa-700 dark:text-emerald-400 shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className={`min-w-[4rem] text-center text-xl font-bold tabular-nums ${
          isWrong ? 'text-red-600 dark:text-red-400' : isNotGiven ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'
        }`}>
          {formattedDisplay}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={isLocked || value >= max}
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
                disabled={isLocked}
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
