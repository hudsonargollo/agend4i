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
    // Ensure environment variables are available to the client
    define: {
      // Make sure VITE_APP_DOMAIN is available in all environments
      __VITE_APP_DOMAIN__: JSON.stringify(env.VITE_APP_DOMAIN),
      __VITE_ENVIRONMENT__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
    },
  };
});
