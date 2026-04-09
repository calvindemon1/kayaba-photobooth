import { createSignal, onMount, Show } from "solid-js";
// DIRECT IMPORT supaya nggak berat nembak ribuan request
import DownloadIcon from "lucide-solid/dist/source/icons/download";
import Zap from "lucide-solid/dist/source/icons/zap";
import ImageIcon from "lucide-solid/dist/source/icons/image";

export default function DownloadPage() {
  const [photoUrl, setPhotoUrl] = createSignal("");
  const [isDownloading, setIsDownloading] = createSignal(false);

  // 1. URL Tunnel Backend lu (Wajib jalan & bisa diakses HP)
  // Pastikan port backend (8000) juga di-tunnel kalau beda domain
  const PUBLIC_BACKEND_URL = "https://moments.kayaba50thanniversary.site";

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const photoPath = params.get("photo"); // Isinya: /results/photos/result/abc.png

    if (photoPath) {
      // Ambil nama filenya saja
      const fileName = photoPath.split("/").pop();
      // Gabungin ke URL static backend lu
      const fullUrl = `${PUBLIC_BACKEND_URL}/photo-result/${fileName}`;
      setPhotoUrl(fullUrl);
    }
  });

  // Fungsi Download supaya beneran ke-save di HP
  const handleDownload = async () => {
    if (!photoUrl()) return;
    setIsDownloading(true);
    try {
      const response = await fetch(photoUrl());
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kayaba-moment-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      // Fallback kalau fetch blob gagal (biasanya CORS)
      window.open(photoUrl(), "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div class="min-h-screen bg-black text-white italic font-sans p-6 flex flex-col items-center select-none">
      {/* Header */}
      <div class="w-full max-w-md flex items-center justify-center gap-3 border-b-2 border-yellow-500 pb-4 mb-8 pt-4">
        <Zap size={24} class="text-yellow-500" fill="currentColor" />
        <h1 class="text-3xl font-black uppercase tracking-tighter italic">
          YOUR <span class="text-yellow-500 font-light">MOMENT</span>
        </h1>
      </div>

      {/* Photo Preview Container */}
      <div class="w-full max-w-md aspect-[3/2] bg-zinc-900 rounded-[40px] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(234,179,8,0.2)] mb-10 animate-pop relative">
        <Show
          when={photoUrl()}
          fallback={
            <div class="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-4">
              <ImageIcon size={64} />
              <p class="font-bold uppercase text-xs tracking-widest">
                Loading Moment...
              </p>
            </div>
          }
        >
          <img
            src={photoUrl()}
            class="w-full h-full object-cover"
            alt="Kayaba Anniversary Moment"
          />
        </Show>
      </div>

      {/* Download Action */}
      <div class="w-full max-w-md flex flex-col gap-6">
        <button
          onClick={handleDownload}
          disabled={!photoUrl() || isDownloading()}
          class={`w-full py-6 rounded-[24px] flex items-center justify-center gap-4 font-black uppercase text-2xl shadow-[0_15px_30px_rgba(234,179,8,0.3)] transition-all active:scale-95 ${
            isDownloading()
              ? "bg-zinc-700 text-zinc-400"
              : "bg-yellow-500 hover:bg-yellow-400 text-black"
          }`}
        >
          <DownloadIcon size={28} stroke-width={3} />
          {isDownloading() ? "Saving..." : "Download Photo"}
        </button>

        <div class="flex flex-col items-center gap-2 mt-4 text-zinc-500">
          <p class="text-center text-[10px] font-black uppercase tracking-[0.3em]">
            KYB 50th Anniversary
          </p>
          <p class="text-center text-[9px] font-bold uppercase tracking-widest opacity-50">
            Official Photobooth System
          </p>
        </div>
      </div>

      <style>{`
        @keyframes popUp {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pop { animation: popUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
}
