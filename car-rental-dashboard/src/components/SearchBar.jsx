import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search' }) {
  return (
    <div className="search">
      <Search size={16} />
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button className="clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
