import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JwtPayload } from './types'

type HeaderInfo = {
  header: any
  setHeader: (h: any) => void
}

export const useHeader = create<HeaderInfo>()((set) => ({
  header: null,
  setHeader: (h) => set({ header: h }),
}))

type LoadingStore = {
  loadingStates: { [key: string]: boolean|undefined }
  setLoading: (key?:string, loading?: boolean) => void
  loading: boolean,
}

export const useLoadingStore = create<LoadingStore>()((set) => ({
  loadingStates: {},
  setLoading: (key, loading) => {
    if (key){
      set((state) => {
        const newLoadingStates = { ...state.loadingStates };
        
        if (loading === undefined) {
          delete newLoadingStates[key];
        } else {
          newLoadingStates[key] = loading;
        }
        
        return {
          ...state,
          loadingStates: newLoadingStates,
          loading: Object.values(newLoadingStates).some(a => a === true)
        };
      });
    }
  },
  loading: false
}))

export const useLoading = () => {
  const [loadingKey, setLoadingKey] = useState<string|undefined>(undefined)
  const setLoading = useLoadingStore((state) => state.setLoading)
  useEffect(() => {
    const k = crypto.randomUUID()
    setLoadingKey(k)
    setLoading(k, false)
    return () => {
      setLoading(k, undefined)
    }
  }, [])
  return { setLoading: (b:boolean)=>setLoading(loadingKey, b) }
}

export const useIsLoading = () => {
  return useLoadingStore((state) => state.loading)
}

type NavigateStore = {
  navigate: ((to: string, options?: object) => void)
  setNavigate: (navigate: (to: string, options?: object) => void) => void
}

export const useRouteFunctions = create<NavigateStore>()((set) => ({
  navigate: (_:string) => {},
  setNavigate: (navigate) => set({ navigate })
}))

type AuthState = {
  isAuthenticated: boolean;
  token: any | null;
  login: (userData: any) => void;
  logout: () => void;
  tokenInfo: () => JwtPayload|null;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      login: (userData) => {
        if (!userData) {
          set({ isAuthenticated: false, token: null });
        }else{
          set({ isAuthenticated: true, token: userData });
        }
      },
      logout: () => {
        set({ isAuthenticated: false, token: null });
      },
      tokenInfo: () => {
        if (!get().token) return null
        const payload = get().token.split('.')[1];
        return JSON.parse(atob(payload)) as JwtPayload;
      },
    }),
    {
      name: 'auth-storage'
    }
  )
)