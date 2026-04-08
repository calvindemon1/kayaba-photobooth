import { createSignal, onMount } from "solid-js";

function Loading() {
  const [isVisible, setIsVisible] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      setIsVisible(true);
    }, 100);
  });

  return (
    <div
      class="min-h-screen w-full flex flex-col items-center justify-center bg-black relative italic overflow-hidden"
      style={{ "font-family": "DenzaRegular" }}
    >
      {/* Background Decor */}
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
        <div class="absolute bottom-0 left-0 w-full h-1 bg-yellow-500"></div>
      </div>

      <div
        class={`flex flex-col items-center transition-all duration-700 ${isVisible() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Modern Industrial Loader */}
        <div class="relative w-64 h-2 bg-zinc-900 rounded-full overflow-hidden mb-8 border border-white/5">
          <div class="absolute inset-0 bg-yellow-500 w-1/2 animate-[loading-bar_1.5s_infinite_ease-in-out]"></div>
        </div>

        <h1 class="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
          PHOTO <span class="text-yellow-500 font-light">BOOTH</span>
        </h1>

        <div class="flex items-center gap-3 mt-4">
          <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <p class="text-white/40 text-[10px] font-black uppercase tracking-[0.6em]">
            System Initialization...
          </p>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export default Loading;
