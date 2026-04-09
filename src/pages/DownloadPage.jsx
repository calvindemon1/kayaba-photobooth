import { createSignal, onMount, Show } from "solid-js";
import DownloadIcon from "lucide-solid/icons/download";
import ZapIcon from "lucide-solid/icons/zap";
import ImageIcon from "lucide-solid/icons/image";

export default function DownloadPage() {
  const [photoUrl, setPhotoUrl] = createSignal("");
  const [isDownloading, setIsDownloading] = createSignal(false);

  // GANTI KE DOMAIN YANG LU KASIH TADI BRO (photobooth, bukan moments)
  const PUBLIC_BACKEND_URL = "https://photobooth.kayaba50thanniversary.site";

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const photoPath = params.get("photo");

    if (photoPath) {
      // Ambil nama filenya saja (misal: f2bee822...png)
      const fileName = photoPath.split("/").pop();
      // Gabungin ke domain backend yang bener
      const fullUrl = `${PUBLIC_BACKEND_URL}/photo-result/${fileName}`;
      setPhotoUrl(fullUrl);
      console.log("Loading photo from:", fullUrl); // Buat debug di console
    }
  });

  const handleDownload = async () => {
    if (!photoUrl()) return;
    setIsDownloading(true);

    try {
      const response = await fetch(photoUrl());
      const blob = await response.blob();

      // Trik: Convert blob ke Base64 Data URL biar browser maksa download
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        const link = document.createElement("a");
        link.href = base64data;

        // Nama file wajib pake extension .png
        link.download = `kayaba-moment-${Date.now()}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Force download failed:", err);
      // Fallback manual jika fetch tetep gagal di beberapa browser
      const link = document.createElement("a");
      link.href = photoUrl();
      link.target = "_blank";
      link.download = "moment.png";
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div class="min-h-screen bg-black text-white italic font-sans p-6 flex flex-col items-center select-none">
      {/* Header */}
      <div class="w-full max-w-md flex items-center justify-center gap-3 border-b-2 border-yellow-500 pb-4 mb-8 pt-4">
        <ZapIcon size={24} class="text-yellow-500" fill="currentColor" />
        <h1 class="text-3xl font-black uppercase tracking-tighter italic leading-none">
          YOUR <span class="text-yellow-500 font-light">MOMENT</span>
        </h1>
      </div>

      {/* Photo Preview Container */}
      <div class="w-full max-w-md aspect-[3/2] bg-zinc-900 rounded-[40px] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(234,179,8,0.2)] mb-10 animate-pop relative">
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
            onLoad={() => console.log("Image loaded successfully")}
            onError={(e) => console.error("Image failed to load:", e)}
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
              ? "bg-zinc-800 text-zinc-500"
              : "bg-yellow-500 hover:bg-yellow-400 text-black"
          }`}
        >
          <DownloadIcon size={28} />
          {isDownloading() ? "Saving..." : "Download Photo"}
        </button>

        <div class="flex flex-col items-center gap-2 mt-4 text-zinc-500">
          <p class="text-center text-[10px] font-black uppercase tracking-[0.3em]">
            KYB 50th Anniversary
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
