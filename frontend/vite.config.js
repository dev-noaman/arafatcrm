import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var backendDir = path.resolve(__dirname, "../backend");
    var backendEnv = loadEnv(mode, backendDir, "");
    var backendPort = backendEnv.BACKEND_PORT || "3001";
    return {
        plugins: [react(), svgr()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: "http://localhost:".concat(backendPort),
                    changeOrigin: true,
                },
                "/uploads": {
                    target: "http://localhost:".concat(backendPort),
                    changeOrigin: true,
                },
            },
        },
    };
});
