import { create } from "zustand"
import { listKey } from "../api/licenses"

export const useLicensesStore = create((set, get) => ({
  licenses: [],
  loading: false,
  availableDays: [],

  fetchLicenses: async () => {
    try {
      set({ loading: true })
      const res = await listKey()
      const licenses = res.data || []
      const daysSet = new Set()
      licenses.forEach(l => { if (l.expDays) daysSet.add(l.expDays) })

      set({
        licenses,
        availableDays: Array.from(daysSet).sort((a, b) => a - b),
      })
    } catch (error) {
      console.log(error)
    } finally {
      set({ loading: false })
    }
  },

  filterByDays: (selectedDays) => {
    const licenses = get().licenses
    if (selectedDays === "all") return licenses
    return licenses.filter(l => l.expDays === parseInt(selectedDays))
  },
}))