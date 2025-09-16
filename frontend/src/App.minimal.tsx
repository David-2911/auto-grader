import React from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { queryClient } from './services/queryClient';
import { createAppTheme } from './styles/theme';
import TestPage from './pages/TestPage';

const App = () => {
  const theme = createAppTheme('light');
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <TestPage />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;