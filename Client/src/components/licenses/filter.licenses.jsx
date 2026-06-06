import Select from "../ui/Select"

// FilterLicenses.jsx
const FilterLicenses = ({ availableDays = [], selectedDay, onChange }) => {
  const options = [
    { value: "all", label: "All" },
    ...availableDays.map((day) => ({ value: day, label: `${day} days` })),
  ]

  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-black/30 px-3">
      <label className="text-xs font-medium text-zinc-600">Days</label>
      <Select
        value={selectedDay}
        onChange={onChange}
        options={options}
        variant="ghost"
        size="sm"
        triggerClassName="text-zinc-300 font-light hover:text-zinc-100"
        menuClassName="w-32"
      />
    </div>
  )
}

export default FilterLicenses
