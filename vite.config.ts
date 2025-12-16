import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Build optimizations for caching
    build: {
      rollupOptions: {
        output: {
          // Generate consistent chunk names for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            
            // Organize assets by type for better caching strategies
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      // Enable source maps for production debugging
      sourcemap: mode === 'production' ? 'hidden' : true,
      // Optimize chunk splitting for better caching
      chunkSizeWarningLimit: 1000,
    },
    // Ensure environment variables are available to the client
    define: {
      // Make sure VITE_APP_DOMAIN is available in all environments
      __VITE_APP_DOMAIN__: JSON.stringify(env.VITE_APP_DOMAIN),
      __VITE_ENVIRONMENT__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
    },
  };
});
