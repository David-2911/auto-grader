// Removed BrowserRouter (we use createBrowserRouter + RouterProvider inside AppRouter)
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Store and theme
import { store } from './store';
import { createAppTheme } from './styles/theme';
import './styles/globals.css';
import { queryClient } from './services/queryClient';

// Router
import AppRouter from './routes/AppRouter';
import AuthInitializer from './components/auth/AuthInitializer';

// Simple Error Boundary to surface runtime issues that would otherwise yield a blank screen
import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace' }}>
          <h2>UI Crash Captured</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const theme = createAppTheme('light'); // Default theme, will be overridden by store

  // Diagnostics
  // eslint-disable-next-line no-console
  console.log('[App] Rendering root with theme mode: light');

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <div className="app">
              <AuthInitializer />
              <AppRouter />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </div>
          </ErrorBoundary>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
