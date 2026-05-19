// FilterLicenses.jsx
import React from "react"

const FilterLicenses = ({ availableDays = [], selectedDay, onChange }) => {
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 h-10">
      <label className="text-zinc-400 text-sm">Filter by Days:</label>
      <select
        value={selectedDay}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-sm"
      >
        <option value="all">All</option>
        {availableDays.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
    </div>
  )
}

export default FilterLicenses