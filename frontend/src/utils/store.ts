
import { create } from 'zustand'

type HeaderInfo = {
  header: any
  setHeader: (h: any) => void
}

export const useHeader = create<HeaderInfo>()((set) => ({
  header: null,
  setHeader: (h) => set({ header: h }),
}))
