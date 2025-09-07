import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { visualizer } from "rollup-plugin-visualizer";

const srcPath = path.resolve(__dirname, "src");

const aliases = fs.readdirSync(srcPath).reduce((acc, item) => {
  const fullPath = path.resolve(srcPath, item);
  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    // Add directories as aliases
    acc[item] = fullPath;
  } else if (stat.isFile() && /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(item)) {
    // Add JavaScript/TypeScript modules as aliases (without the extension)
    const aliasName = path.parse(item).name;
    acc[aliasName] = fullPath;
  }

  return acc;
}, {});

// const tsconfigPath = path.resolve(__dirname, "tsconfig.json");
// const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
// tsconfig.compilerOptions.paths = {
//   ...tsconfig.compilerOptions.paths,
//   ...Object.fromEntries(
//     Object.entries(aliases).map(([key, value]) => [`${key}/*`, [`./${key}/*`]])
//   ),
// };
// fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

export default defineConfig({
  base: "./",
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              compilationMode: "infer",
              target: "19",
              panicThreshold: "none",
              logger: {
                logEvent(filename, event) {
                  if (event.kind === "CompileSuccess") {
                    console.log("Compiled:", filename);
                  }
                },
              },
            },
          ],
        ],
      },
    }),
    tailwindcss(),
    visualizer(),
  ],
  resolve: {
    alias: {
      ...aliases,
    },
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web", "@huggingface/transformers"],
  },
  assetsInclude: ["**/*.onnx", "**/*.wasm"],
  build: {
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ["react", "react-dom"],
      },
    },
  },
});
