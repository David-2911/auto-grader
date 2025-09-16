import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';

// Store and theme
import { store } from './store';
import { createAppTheme } from './styles/theme';
import { queryClient } from './services/queryClient';

// Simplified Router for testing
import AppRouter from './routes/AppRouter.simple';

const App = () => {
  const theme = createAppTheme('light');

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <div className="app">
              <AppRouter />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;