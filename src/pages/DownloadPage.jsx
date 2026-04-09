import { createSignal, onMount, Show } from "solid-js";
import DownloadIcon from "lucide-solid/icons/download";
import ZapIcon from "lucide-solid/icons/zap";
import ImageIcon from "lucide-solid/icons/image";

export default function DownloadPage() {
  const [photoUrl, setPhotoUrl] = createSignal("");

  // Domain Backend sesuai request terakhir lu
  const PUBLIC_BACKEND_URL = "https://photobooth.kayaba50thanniversary.site";

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const photoPath = params.get("photo");

    if (photoPath) {
      // Ambil nama filenya saja (misal: f2bee822...png)
      const fileName = photoPath.split("/").pop();
      // Gabungin ke domain backend
      const fullUrl = `${PUBLIC_BACKEND_URL}/photo-result/${fileName}`;
      setPhotoUrl(fullUrl);
    }
  });

  const handleDownload = () => {
    if (!photoUrl()) return;

    /* INFO: Karena isu CORS pada Cross-Domain Fetch, 
      kita arahkan user untuk membuka gambar langsung 
      agar bisa di-save manual (Standard Mobile Behavior).
    */
    const link = document.createElement("a");
    link.href = photoUrl();
    link.target = "_blank";
    link.setAttribute("download", `kayaba-moment.png`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div class="min-h-screen bg-black text-white italic font-sans p-6 flex flex-col items-center select-none">
      <style>{`
        @keyframes popUp {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pop { animation: popUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hint-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>

      {/* Header */}
      <div class="w-full max-w-md flex items-center justify-center gap-3 border-b-2 border-yellow-500 pb-4 mb-8 pt-4">
        <ZapIcon size={24} class="text-yellow-500" fill="currentColor" />
        <h1 class="text-3xl font-black uppercase tracking-tighter italic leading-none">
          YOUR <span class="text-yellow-500 font-light">MOMENT</span>
        </h1>
      </div>

      {/* Photo Preview Container */}
      <div class="w-full max-w-md aspect-[3/2] bg-zinc-900 rounded-[40px] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(234,179,8,0.2)] mb-6 animate-pop relative">
        <Show
          when={photoUrl()}
          fallback={
            <div class="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-4">
              <div class="animate-spin duration-1000">
                <ZapIcon size={48} class="text-yellow-500/20" />
              </div>
              <p class="font-bold uppercase text-[10px] tracking-widest text-center opacity-50">
                Initializing Moment...
              </p>
            </div>
          }
        >
          <img
            src={photoUrl()}
            class="w-full h-full object-cover"
            alt="Moment"
          />
        </Show>
      </div>

      {/* Mobile Tip */}
      <div class="mb-8 bg-white/5 border border-white/10 py-3 px-6 rounded-2xl flex items-center gap-3 hint-pulse">
        <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <p class="text-[10px] uppercase font-black tracking-widest text-zinc-400">
          Tip: Long-press image to Save to Gallery
        </p>
      </div>

      {/* Download Action */}
      <div class="w-full max-w-md flex flex-col gap-6">
        <button
          onClick={handleDownload}
          disabled={!photoUrl()}
          class="w-full py-6 rounded-[24px] flex items-center justify-center gap-4 font-black uppercase text-2xl shadow-[0_15px_30px_rgba(234,179,8,0.3)] transition-all active:scale-95 bg-yellow-500 hover:bg-yellow-400 text-black disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          <DownloadIcon size={28} />
          Get Photo
        </button>

        <div class="flex flex-col items-center gap-2 mt-4 text-zinc-500">
          <p class="text-center text-[10px] font-black uppercase tracking-[0.3em]">
            KYB 50th Anniversary
          </p>
        </div>
      </div>
    </div>
  );
}
