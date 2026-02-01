import React from 'react';
import ReactDOM from 'react-dom/client';
import FinancialTracker from './components/FinancialTracker';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <FinancialTracker />
    </ThemeProvider>
  </React.StrictMode>
);
