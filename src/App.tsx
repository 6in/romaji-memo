import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background text-foreground">
        <p className="p-4">Romaji Memo</p>
      </div>
    </QueryClientProvider>
  )
}

export default App
