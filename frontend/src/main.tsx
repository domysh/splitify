import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoadingOverlay, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'
import '@/styles/index.css'

const App = lazy(() => import('@/App.tsx'))

const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: Infinity
} }})

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <MantineProvider defaultColorScheme='dark'>
      <Suspense fallback={
          <LoadingOverlay
            visible={true} 
            zIndex={10000} 
            overlayProps={{ radius: "sm", backgroundOpacity: 0.2 }} 
            loaderProps={{ color: 'indigo', type: 'bars', size: 'md' }}
          />
        }>
        <App />
      </Suspense>
    </MantineProvider>
  </QueryClientProvider>
</React.StrictMode>)
