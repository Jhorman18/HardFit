import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
  subtitle?: string
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar o seleccionar...',
  emptyMessage = 'No se encontraron resultados',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = normalize(searchQuery.trim())
    return options.filter((opt) => {
      const matchLabel = normalize(opt.label).includes(q)
      const matchSubtitle = opt.subtitle ? normalize(opt.subtitle).includes(q) : false
      return matchLabel || matchSubtitle
    })
  }, [options, searchQuery])

  // Clamp highlight index to prevent out-of-bounds
  const safeHighlightIndex =
    filteredOptions.length > 0
      ? Math.min(highlightedIndex, filteredOptions.length - 1)
      : 0

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && safeHighlightIndex >= 0) {
      const item = listRef.current.children[safeHighlightIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [safeHighlightIndex, isOpen])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, filteredOptions.length - 1)
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[safeHighlightIndex]) {
        handleSelect(filteredOptions[safeHighlightIndex].value)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  const inputValue = isOpen
    ? searchQuery
    : selectedOption
      ? selectedOption.label
      : ''

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-3 text-neutral-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => {
            if (!disabled && !isOpen) {
              setIsOpen(true)
            }
          }}
          onClick={() => {
            if (!disabled && !isOpen) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-16 py-2.5 text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isOpen && searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                inputRef.current?.focus()
              }}
              className="text-neutral-400 hover:text-white p-0.5 rounded transition"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev)
                if (!isOpen) {
                  inputRef.current?.focus()
                } else {
                  setSearchQuery('')
                }
              }
            }}
            className="text-neutral-400 hover:text-white p-0.5 transition"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-neutral-400">
              {emptyMessage}
            </div>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1 divide-y divide-neutral-800/40"
            >
              {filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value
                const isHighlighted = index === safeHighlightIndex

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 text-xs transition flex items-center justify-between cursor-pointer ${
                      isHighlighted
                        ? 'bg-neutral-800 text-white'
                        : isSelected
                          ? 'bg-neutral-800/50 text-white'
                          : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`truncate ${isSelected ? 'font-bold text-white' : 'font-medium'}`}>
                        {opt.label}
                      </span>
                      {opt.subtitle && (
                        <span className="text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                          {opt.subtitle}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={13} className="text-white shrink-0 ml-1" />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
