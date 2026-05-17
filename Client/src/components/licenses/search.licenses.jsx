import { Search } from "lucide-react"

const SearchLicenses = ({ value, onChange }) => {
  return (
    <div className="relative">
      
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
      />

      <input
        type="text"
        placeholder="Search licenses key..."
        value={value}
        onChange={onChange}
        className="w-80 h-11 pl-11 pr-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/40 focus:bg-zinc-950 transition-all duration-200"
      />

    </div>
  )
}

export default SearchLicenses