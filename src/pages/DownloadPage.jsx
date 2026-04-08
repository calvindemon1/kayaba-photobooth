import { createSignal, onMount } from "solid-js";
import { Download, Zap, ImageIcon } from "lucide-solid";

export default function DownloadPage() {
  // Ambil URL foto dari path (misal: /download?photo=abc.jpg)
  const [photoUrl, setPhotoUrl] = createSignal("");

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const photo = params.get("photo");
    if (photo) setPhotoUrl(photo);
  });

  const handleDownload = async () => {
    try {
      const response = await fetch(photoUrl());
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kayaba-photobooth-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div class="min-h-screen bg-black text-white italic font-sans p-6 flex flex-col items-center">
      {/* Header Senada */}
      <div class="w-full max-w-md flex items-center justify-center gap-3 border-b-2 border-yellow-500 pb-4 mb-8">
        <Zap size={20} class="text-yellow-500" fill="currentColor" />
        <h1 class="text-2xl font-black uppercase tracking-tighter italic">
          YOUR <span class="text-yellow-500 font-light">MOMENT</span>
        </h1>
      </div>

      {/* Photo Preview Container */}
      <div class="w-full max-w-md aspect-[3/2] bg-zinc-900 rounded-[32px] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(234,179,8,0.15)] mb-8 animate-pop">
        <Show
          when={photoUrl()}
          fallback={
            <div class="w-full h-full flex items-center justify-center text-zinc-700">
              <ImageIcon size={48} />
            </div>
          }
        >
          <img src={photoUrl()} class="w-full h-full object-cover" />
        </Show>
      </div>

      {/* Download Action */}
      <div class="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={handleDownload}
          class="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-6 rounded-[20px] flex items-center justify-center gap-3 font-black uppercase text-xl shadow-[0_10px_20px_rgba(234,179,8,0.3)] transition-all active:scale-95"
        >
          <Download size={24} stroke-width={3} />
          Download Photo
        </button>

        <p class="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest mt-4">
          Kayaba Photobooth
        </p>
      </div>

      <style>{`
        @keyframes popUp {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pop { animation: popUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
}
