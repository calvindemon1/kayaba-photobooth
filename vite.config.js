import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  server: {
    host: true,
    port: 3344,
  },
  allowedHosts: ["moments.kayaba50thanniversary.site"],
  build: {
    target: "esnext",
  },
});
