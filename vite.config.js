import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  server: {
    host: true,
    port: 3344,
    // PINDAHIN KE SINI BRO:
    allowedHosts: [
      "moments.kayaba50thanniversary.site",
      "lv24k4r6-3344.asse.devtunnels.ms", // Tambahin juga domain tunnel lu biar aman
    ],
  },
  build: {
    target: "esnext",
  },
});
