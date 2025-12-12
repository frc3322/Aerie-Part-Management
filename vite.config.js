import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import handlebars from "vite-plugin-handlebars";

// Get base path from environment variable or default to '/'
// Usage: VITE_BASE_PATH=/part-management-system npm run build
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
    base: basePath,
    server: {
        port: 5173,
        open: false,
        proxy: {
            "/api": {
                target: "http://localhost:6060",
                changeOrigin: true,
            },
        },
    },
    plugins: [
        tailwindcss(),
        handlebars({
            partialDirectory: [
                path.resolve(__dirname, "./src/templates/layout"),
                path.resolve(__dirname, "./src/templates/content"),
                path.resolve(__dirname, "./src/templates/modals"),
            ],
        }),
    ],
    build: {
        // Enable minification with terser for smaller bundles
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        // Optimize chunk splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separate Three.js into its own chunk for better caching
                    three: ["three"],
                },
                // Use content hash for better caching
                chunkFileNames: "assets/[name]-[hash].js",
                entryFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash].[ext]",
            },
        },
        // Target modern browsers for smaller bundles
        target: "es2020",
        // Disable source maps in production for smaller bundles
        sourcemap: false,
        // Optimize CSS
        cssMinify: true,
    },
});
