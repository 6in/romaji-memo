import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Converter } from './components/Converter';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background text-foreground overflow-hidden">
        <Converter />
      </div>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

export default App;
