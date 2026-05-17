import { create } from "zustand"
import { listKey } from "../api/licenses"

export const useLicensesStore = create((set) => ({
  licenses: [],
  loading: false,

  fetchLicenses: async () => {
    try {
      set({ loading: true })
      const res = await listKey()
      set({
        licenses: res.data || [],
      })
    } catch (error) {
      console.log(error)
    } finally {
      set({ loading: false })
    }
  },
}))