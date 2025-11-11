/**
 * Entry Point for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * Initializes the React application with comprehensive error handling,
 * performance monitoring, and internationalization support.
 */

import React from 'react'; // ^18.2.0
import { createRoot } from 'react-dom/client'; // ^18.2.0
import { StrictMode } from 'react'; // ^18.2.0
// import * as NewRelic from 'newrelic-browser'; // ^1.0.0 - Disabled: package not available

import App from './App';
import initI18n from './config/i18n.config';

// Constants
const ROOT_ELEMENT_ID = 'root';
const PERFORMANCE_CONFIG = {
  maxJsHeapSize: '512MB',
  maxResponseTime: '200ms',
  targetFCP: '1000ms',
  targetLCP: '2500ms'
};

/**
 * Configures global error handling and reporting
 */
const setupErrorHandling = (): void => {
  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    //     // NewRelic.noticeError(error || new Error(String(message)), {
    //   source,
    //   lineno,
    //   colno
    // });
    console.error('Global error:', { message, source, lineno, colno, error });
    return false;
  };

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    //     NewRelic.noticeError(event.reason);
    event.preventDefault();
  });

  // React error boundary fallback
  if (process.env.NODE_ENV === 'production') {
    console.error = (message, ...args) => {
    //       NewRelic.noticeError(new Error(String(message)));
      // Preserve original console.error behavior
      console.warn(message, ...args);
    };
  }
};

/**
 * Initializes performance monitoring and tracking
 */
const setupPerformanceMonitoring = (): void => {
  // Initialize NewRelic monitoring - DISABLED
  // NewRelic.setCustomAttribute('environment', process.env.NODE_ENV);
  // NewRelic.setErrorHandler((error) => {
  //   return {
  //     ignore: error.message.includes('ResizeObserver loop limit exceeded')
  //   };
  // });

  // Core Web Vitals monitoring
  if ('PerformanceObserver' in window) {
    const vitalsObserver = new PerformanceObserver((entries) => {
      entries.getEntries().forEach((entry) => {
        // NewRelic.addPageAction('web-vitals', {
        //   name: entry.name,
        //   value: entry.value,
        //   rating: entry.rating
        // });
        console.log('Web Vitals:', entry.name, entry.value);
      });
    });

    vitalsObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  }

  // Performance marks and measures
  performance.mark('app-init-start');
};

/**
 * Initializes and renders the React application
 */
const renderApp = async (): Promise<void> => {
  try {
    // Initialize error handling and monitoring
    setupErrorHandling();
    setupPerformanceMonitoring();

    // Initialize i18next with Brazilian Portuguese support
    await initI18n();

    // Get root element
    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (!rootElement) {
      throw new Error(`Element with id '${ROOT_ELEMENT_ID}' not found`);
    }

    // Create React root and render app
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // Remove loading indicator if present
    const loadingElement = document.getElementById('initial-loader');
    if (loadingElement?.parentNode) {
      loadingElement.parentNode.removeChild(loadingElement);
    }

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch((error) => {
          console.error('ServiceWorker registration failed:', error);
        });
      });
    }

    // Performance measurement
    performance.mark('app-init-end');
    performance.measure('app-initialization', 'app-init-start', 'app-init-end');

    // Setup cross-tab communication
    const channel = new BroadcastChannel('austa_health_portal');
    channel.onmessage = (event) => {
      if (event.data.type === 'VERSION_MISMATCH') {
        window.location.reload();
      }
    };

  } catch (error) {
    console.error('Failed to initialize application:', error);
    //     NewRelic.noticeError(error as Error);
    
    // Show error message to user
    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h1>Erro ao iniciar aplicação</h1>
          <p>Por favor, tente novamente em alguns instantes.</p>
          <button onclick="window.location.reload()">Tentar Novamente</button>
        </div>
      `;
    }
  }
};

// Initialize application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}