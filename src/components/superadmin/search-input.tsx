interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-muted-foreground">
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-lg text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20 focus:border-superadmin-accent"
      />
    </div>
  )
}
