import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"

const Select = ({
  value,
  onChange,
  options, // Array of { value, label } or simple values
  className = "",
  triggerClassName = "",
  menuClassName = "",
  variant = "default", // 'default' | 'ghost'
  size = "md", // 'sm' | 'md'
  placeholder = "Select option",
  align = "left", // 'left' | 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Normalize options to objects { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return opt
    }
    return { value: opt, label: String(opt) }
  })

  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
  }

  // Size classes for trigger button (sleek and compact height)
  const sizeClasses = {
    sm: "h-8 px-2.5 text-[12px] rounded-md",
    md: "h-9 px-3 text-sm rounded-lg",
  }

  // Variant classes for trigger button (thin borders and subtle background)
  const variantClasses = {
    default: `bg-zinc-950/40 border border-zinc-800/80 text-zinc-300 transition-all duration-200 
      ${isOpen ? "border-zinc-700 bg-zinc-900/30 text-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.02)]" : "hover:border-zinc-700/80 hover:text-zinc-100"}`,
    ghost: `bg-transparent text-zinc-400 hover:text-zinc-200 transition-colors duration-150`,
  }

  const alignmentClasses = {
    left: "left-0",
    right: "right-0",
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 font-light outline-none select-none cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${triggerClassName}`}
      >
        <span className="truncate leading-none">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={size === "sm" ? 13 : 14}
          className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-zinc-300" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {/* Dropdown Menu list with sleek scale-slide animation */}
      <div
        className={`absolute z-50 mt-1 min-w-[120px] rounded-lg border border-zinc-800/70 bg-zinc-950/95 p-1 shadow-2xl shadow-black/80 backdrop-blur-md transition-all duration-150 origin-top ${alignmentClasses[align]} ${menuClassName} ${
          isOpen
            ? "visible opacity-100 scale-100 translate-y-0"
            : "invisible opacity-0 scale-98 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center justify-between rounded-md cursor-pointer transition-colors duration-100 select-none font-light ${
                  size === "sm" ? "px-2.5 py-1.5 text-[12.5px]" : "px-3 py-1.5 text-sm"
                } ${
                  isSelected
                    ? "bg-zinc-800/50 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                } ${opt.className || ""}`}
              >
                <span className="truncate leading-none">{opt.label}</span>
                {isSelected && (
                  <Check
                    size={size === "sm" ? 12 : 13}
                    className="text-emerald-400 shrink-0 ml-3"
                    strokeWidth={2}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Select
