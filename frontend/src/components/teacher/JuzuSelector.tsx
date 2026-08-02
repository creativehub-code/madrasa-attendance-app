import React from 'react';

interface JuzuSelectorProps {
  value: number;
  onChange: (juzu: number) => void;
  disabled?: boolean;
  label?: string;
  max?: number;
}

export default function JuzuSelector({
  value,
  onChange,
  disabled = false,
  label = 'Current Juzu',
  max = 30,
}: JuzuSelectorProps) {
  const juzus = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="w-full">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      <div className="flex w-full overflow-x-auto py-2 pb-3 scrollbar-hide gap-2 items-center no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {juzus.map((juzu) => {
          const isActive = juzu === value;
          return (
            <button
              key={juzu}
              type="button"
              disabled={disabled}
              onClick={() => onChange(juzu)}
              style={{ borderRadius: '9999px' }}
              className={`flex h-12 w-12 shrink-0 flex-shrink-0 aspect-square items-center justify-center rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none focus-visible:outline-none select-none border-2 ${
                isActive
                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                  : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {juzu}
            </button>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
