import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import { checker } from 'vite-plugin-checker'; // ^0.6.0
import reactSwc from '@vitejs/plugin-react-swc'; // ^3.3.0
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React plugin with Emotion support for styled components
    react({
      fastRefresh: true,
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    
    // Runtime type checking for enhanced development
    checker({
      typescript: true,
      overlay: true,
      enableBuild: false, // Disable in production for performance
      terminal: true
    }),
    
    // SWC for faster builds and development
    reactSwc({
      tsDecorators: true,
      plugins: true
    })
  ],

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    cors: true,
    hmr: {
      overlay: true
    },
    // API proxy configuration
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: process.env.NODE_ENV === 'production',
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 30000, // 30s timeout matching performance requirements
        headers: {
          'X-Real-IP': '${remote-addr}'
        }
      }
    }
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // UI framework chunks
          ui: [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          
          // State management chunks
          state: ['@reduxjs/toolkit', 'react-redux'],
          
          // Internationalization chunks
          i18n: ['i18next', 'react-i18next'],
          
          // Form handling chunks
          forms: ['react-hook-form', 'yup', '@hookform/resolvers'],
          
          // Utility chunks
          utils: ['date-fns', 'lodash', 'axios']
        }
      }
    },
    
    // Performance optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    modulePreload: true
  },

  // Module resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      '@reduxjs/toolkit',
      'react-redux',
      'i18next',
      'react-i18next',
      'react-hook-form',
      'yup'
    ],
    exclude: ['@vitejs/plugin-react-swc'],
    esbuildOptions: {
      target: 'es2020'
    }
  },

  // Environment configuration
  envPrefix: 'VITE_',
  
  // Performance optimizations
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'es2020',
    legalComments: 'none'
  }
});