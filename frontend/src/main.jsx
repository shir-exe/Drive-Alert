import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/navbar.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/gauge.css';
import './styles/dashboard.css';
import './styles/forms.css';
import './styles/history.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
