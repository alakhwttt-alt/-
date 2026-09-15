import { useState, useRef, useEffect, useMemo } from 'react';

interface Suggestion {
  label: string;
  sublabel?: string;
  value: string;
  pairedValue?: string;
}

interface AutocompleteFieldProps {
  value: string;
  onChange: (value: string) => void;
  onPairSelect?: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  type?: 'text' | 'tel';
  dir?: 'ltr' | 'rtl';
  label?: string;
  required?: boolean;
  className?: string;
}

export function AutocompleteField({
  value,
  onChange,
  onPairSelect,
  suggestions,
  placeholder,
  type = 'text',
  dir,
  label,
  required,
  className = 'input-field',
}: AutocompleteFieldProps) {
  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8);
    const q = value.trim().toLowerCase();
    return suggestions
      .filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          (s.sublabel || '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [value, suggestions]);

  const showDropdown = focused && filtered.length > 0;

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [value, focused]);

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 150);
  };

  const selectSuggestion = (s: Suggestion) => {
    onChange(s.value);
    if (s.pairedValue !== undefined && onPairSelect) {
      onPairSelect(s.pairedValue);
    }
    setFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="input-label">
          {label}{required && ' *'}
        </label>
      )}
      <input
        type={type}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        dir={dir}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map((s, idx) => (
            <button
              key={`${s.label}-${idx}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full text-right px-4 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                idx === highlightedIndex ? 'bg-teal-50' : 'hover:bg-slate-50'
              }`}
            >
              <span className="text-sm font-semibold text-slate-800 truncate">
                {s.label}
              </span>
              {s.sublabel && (
                <span className="text-xs text-slate-400 flex-shrink-0" dir="ltr">
                  {s.sublabel}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
