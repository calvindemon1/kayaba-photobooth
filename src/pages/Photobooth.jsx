import { createSignal, onMount, Show, For, Switch, Match } from "solid-js";
import QRCode from "qrcode";
import {
  Camera,
  Printer,
  RotateCcw,
  LayoutGrid,
  BarChart3,
  X,
  Zap,
  Eye,
  Check,
  Trash2,
} from "lucide-solid";

export default function Photobooth() {
  const BASE_URL = "http://localhost:8000";
  const DOWNLOAD_PAGE_URL = "https://lv24k4r6-3344.asse.devtunnels.ms/download";

  const [photo, setPhoto] = createSignal(null);
  const [processedPhoto, setProcessedPhoto] = createSignal(null);
  const [gallery, setGallery] = createSignal([]);
  const [isLoadingGallery, setIsLoadingGallery] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [countdown, setCountdown] = createSignal(null);
  const [showStats, setShowStats] = createSignal(false);
  const [showGallery, setShowGallery] = createSignal(false);
  const [stats, setStats] = createSignal({ taken: 0, printed: 0 });
  const [previewItem, setPreviewItem] = createSignal(null);
  const [activeTab, setActiveTab] = createSignal("photo");

  let qrCanvasRef;

  const playAudio = (path) => {
    const audio = new Audio(path);
    audio.play().catch((err) => console.warn("Audio play blocked:", path));
  };

  const fetchStatistics = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/statistics`);
      const data = await res.json();
      if (data.statistics) {
        setStats({
          taken: data.statistics.photo_count || 0,
          printed: data.statistics.print_count || 0,
        });
      }
    } catch (err) {
      console.error("Stats Error:", err);
    }
  };

  // --- FIX GALLERY FETCHING LOGIC ---
  const fetchGallery = async () => {
    setIsLoadingGallery(true);
    try {
      // Ambil data dari lokal saja karena folder lokal yang jadi patokan utama
      const resLocal = await fetch(
        `${BASE_URL}/api/all-local-photos-and-generated-qrs`,
      );
      const dataLocal = await resLocal.json();

      if (dataLocal.paths) {
        const mappedGallery = dataLocal.paths.map((item) => {
          // Ambil nama file murni (misal: abc.png)
          const fileName = item.result_photo_url.split(/[\\/]/).pop();

          // Path untuk nampilin di UI Photobooth (pake IP Lokal BE)
          const localSrc = `${BASE_URL}/photo-result/${fileName}`;

          // Path Cloud untuk di scan QR (URL yang bakal dibuka di HP user)
          // Kita kirim path '/results/photos/result/abc.png' ke download page
          const cloudPath = item.result_photo_url;
          const downloadUrl = `${DOWNLOAD_PAGE_URL}?photo=${encodeURIComponent(cloudPath)}`;

          return {
            src: localSrc,
            downloadUrl: downloadUrl,
            createdAt: item.created_at,
          };
        });

        // Urutkan dari yang paling baru (Newest First)
        setGallery(mappedGallery.reverse());
      }
    } catch (err) {
      console.error("Gallery Error:", err);
    } finally {
      setTimeout(() => setIsLoadingGallery(false), 600);
    }
  };

  const generateQRInModal = (url) => {
    if (qrCanvasRef) {
      QRCode.toCanvas(qrCanvasRef, url, { width: 350, margin: 2 }, (err) => {
        if (err) console.error(err);
      });
    }
  };

  const togglePrintStatus = async (isPrinted) => {
    try {
      const formData = new FormData();
      formData.append("is_printed", isPrinted ? "1" : "0");
      await fetch(`${BASE_URL}/api/print-toggle`, {
        method: "POST",
        body: formData,
      });
      await fetchStatistics();
    } catch (err) {
      console.error("Toggle Error:", err);
    }
  };

  const base64ToBlob = (base64) => {
    const parts = base64.split(";base64,");
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
    return new Blob([uInt8Array], { type: contentType });
  };

  const handleCapture = async () => {
    try {
      await fetch(`${BASE_URL}/takephoto-landscape`);
      const resPreview = await fetch(`${BASE_URL}/getpreviewpath`);
      const dataPreview = await resPreview.json();

      if (dataPreview.photo) {
        const fileName = dataPreview.photo.split(/[\\/]/).pop();
        const freshUrl = `${BASE_URL}/photo-temporary/${fileName}?t=${Date.now()}`;
        setPhoto(freshUrl);
        playAudio("/sfx/shutter.mp3");
      }
    } catch (err) {
      console.error("Capture Error:", err);
    }
  };

  const handleUsePhoto = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("framing_option_int", "0");

      const res = await fetch(`${BASE_URL}/api/copy-and-get-download-path`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const resFinal = await fetch(`${BASE_URL}/getresultpath`);
        const dataFinal = await resFinal.json();

        if (dataFinal.photo) {
          const fileName = dataFinal.photo.split(/[\\/]/).pop();
          setProcessedPhoto(
            `${BASE_URL}/photo-result/${fileName}?t=${Date.now()}`,
          );
          await fetchStatistics();
          await fetchGallery();
        }
      }
    } catch (err) {
      console.error("Process Photo Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setPhoto(null);
    setProcessedPhoto(null);
    setIsProcessing(false);
  };

  onMount(() => {
    fetchStatistics();
    fetchGallery();
  });

  const startCaptureSequence = () => {
    resetCapture();
    setCountdown(3);
    playAudio("/sfx/countdown.mp3");
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCapture();
          return null;
        }
        playAudio("/sfx/countdown.mp3");
        return prev - 1;
      });
    }, 1000);
  };

  const handleNativePrint = (imgUrl) => {
    togglePrintStatus(true);
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <style>
            @page { size: 15.4cm 10.3cm landscape; margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; }
            img { width: 15.4cm; height: 10.3cm; object-fit: cover; }
          </style>
        </head>
        <body>
          <img src="${imgUrl}" id="print-img">
          <script>
            const img = document.getElementById('print-img');
            img.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
  };

  return (
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden flex flex-col text-white select-none p-4 italic font-sans">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .standard-btn { border-radius: 40px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
        .standard-btn:active { transform: scale(0.95); }
        .loader { width: 64px; height: 64px; border: 8px solid #FFF; border-bottom-color: #eab308; border-radius: 50%; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 20px; border: 3px solid black; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #eab308; }
      `}</style>

      {/* HEADER */}
      <div class="shrink-0 flex justify-between items-center border-b-4 border-yellow-500 pb-6 mb-6">
        <div class="flex items-center gap-6">
          <Zap
            size={48}
            class="text-yellow-500 animate-pulse"
            fill="currentColor"
          />
          <h1 class="text-6xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO <span class="text-yellow-500 font-light">BOOTH</span>
          </h1>
        </div>
        <div class="flex gap-6">
          <button
            onClick={() => {
              fetchStatistics();
              setShowStats(true);
            }}
            class="bg-zinc-900 p-6 border-2 border-white/10 standard-btn hover:border-yellow-500"
          >
            <BarChart3 size={40} />
          </button>
          <button
            onClick={() => {
              fetchGallery();
              setShowGallery(true);
            }}
            class="bg-zinc-900 p-6 border-2 border-white/10 standard-btn hover:border-yellow-500"
          >
            <LayoutGrid size={40} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div class="flex-1 flex flex-col gap-10 items-center justify-center min-h-0">
        <div class="relative aspect-[3/2] w-full max-w-[95vw] bg-zinc-900 border-4 overflow-hidden rounded-[60px] border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          <Show when={!photo() && !processedPhoto()}>
            <img
              src={`${BASE_URL}/stream-landscape?t=${Date.now()}`}
              class="w-full h-full object-cover"
              alt="Live Stream"
            />
          </Show>

          <Show when={photo() && !processedPhoto()}>
            <img src={photo()} class="w-full h-full object-cover animate-pop" />
            <Show when={isProcessing()}>
              <div class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 backdrop-blur-xl">
                <span class="loader"></span>
                <span class="font-black uppercase italic text-yellow-500 tracking-[0.3em] animate-pulse text-3xl">
                  Processing Final...
                </span>
              </div>
            </Show>
          </Show>

          <Show when={processedPhoto()}>
            <img
              src={processedPhoto()}
              class="w-full h-full object-cover animate-pop"
            />
            <div class="absolute top-12 left-12 bg-green-500 text-black font-black px-10 py-4 rounded-full text-2xl uppercase italic animate-bounce shadow-2xl border-4 border-black">
              READY!
            </div>
          </Show>

          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
              <span class="text-[20rem] font-black text-yellow-500 animate-ping italic drop-shadow-[0_0_40px_rgba(234,179,8,0.6)]">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        <div class="w-full max-w-[700px] h-40 flex gap-8 shrink-0 pb-4">
          <Switch>
            <Match when={!photo() && !processedPhoto()}>
              <button
                onClick={startCaptureSequence}
                class="flex-1 bg-white text-black flex items-center justify-center gap-8 border-b-[16px] border-zinc-400 standard-btn hover:bg-yellow-500 hover:border-yellow-700 transition-all"
              >
                <Camera size={80} />
                <span class="font-black uppercase text-6xl italic tracking-tighter">
                  Capture
                </span>
              </button>
            </Match>
            <Match when={photo() && !processedPhoto()}>
              <div class="flex-1 flex gap-6">
                <button
                  onClick={handleUsePhoto}
                  disabled={isProcessing()}
                  class="flex-[2] bg-yellow-500 text-black flex items-center justify-center gap-6 border-b-[12px] border-yellow-700 standard-btn shadow-2xl"
                >
                  <Check size={60} />
                  <span class="font-black uppercase text-5xl italic">YES</span>
                </button>
                <button
                  onClick={resetCapture}
                  disabled={isProcessing()}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-6 border-b-[12px] border-red-900 standard-btn"
                >
                  <Trash2 size={40} class="text-red-500" />
                  <span class="font-black uppercase text-2xl italic">
                    RETAKE
                  </span>
                </button>
              </div>
            </Match>
            <Match when={processedPhoto()}>
              <div class="flex-1 flex gap-6 animate-pop">
                <button
                  onClick={() => handleNativePrint(processedPhoto())}
                  class="flex-[2.5] bg-yellow-500 text-black flex items-center justify-center gap-8 border-b-[12px] border-yellow-700 standard-btn shadow-[0_0_50px_rgba(234,179,8,0.5)]"
                >
                  <Printer size={80} />
                  <span class="font-black uppercase text-5xl italic">
                    PRINT
                  </span>
                </button>
                <button
                  onClick={resetCapture}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-6 border-b-[12px] border-zinc-600 standard-btn"
                >
                  <RotateCcw size={50} />
                  <span class="font-black uppercase text-3xl italic text-zinc-400">
                    NEW
                  </span>
                </button>
              </div>
            </Match>
          </Switch>
        </div>
      </div>

      {/* GALLERY MODAL - FIXED SCROLLING & MAPPING */}
      <Show when={showGallery()}>
        <div class="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-3xl p-8 animate-pop">
          <div class="shrink-0 flex justify-between items-center mb-10 border-b-4 border-yellow-500 pb-8">
            <div class="flex flex-col">
              <h2 class="text-6xl font-black italic uppercase text-white tracking-tighter leading-none">
                Archives
              </h2>
              <span class="text-yellow-500 font-bold text-xl mt-3 uppercase tracking-[0.2em]">
                {gallery().length} Moments Recorded
              </span>
            </div>
            <button
              onClick={() => setShowGallery(false)}
              class="bg-zinc-800 p-8 rounded-[40px] hover:bg-red-600 transition-all group"
            >
              <X
                size={60}
                class="group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto pr-6 custom-scrollbar">
            <div class="grid grid-cols-2 gap-10 pb-32">
              <For each={gallery()}>
                {(item) => (
                  <div class="group relative aspect-[3/2] bg-zinc-900 border-2 border-white/10 rounded-[60px] overflow-hidden shadow-2xl transition-all duration-300 hover:border-yellow-500">
                    <img
                      src={item.src}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 gap-16 backdrop-blur-md">
                      <button
                        onClick={() => {
                          setPreviewItem(item);
                          setActiveTab("photo");
                        }}
                        class="bg-white text-black p-10 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-2xl"
                      >
                        <Eye size={60} />
                      </button>
                      <button
                        onClick={() => handleNativePrint(item.src)}
                        class="bg-yellow-500 text-black p-10 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-2xl"
                      >
                        <Printer size={60} />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </div>
      </Show>

      {/* PREVIEW MODAL */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-10 animate-pop">
          <div class="relative flex flex-col bg-zinc-900 border-2 border-white/10 rounded-[80px] overflow-hidden w-full max-w-[1000px] shadow-[0_0_120px_rgba(0,0,0,1)]">
            <div class="flex border-b-2 border-white/10 h-24 bg-zinc-900 text-2xl">
              <button
                onClick={() => setActiveTab("photo")}
                class={`flex-1 font-black uppercase italic ${activeTab() === "photo" ? "bg-white text-black" : "text-white/50"}`}
              >
                View Photo
              </button>
              <button
                onClick={() => {
                  setActiveTab("qr");
                  setTimeout(
                    () => generateQRInModal(previewItem().downloadUrl),
                    50,
                  );
                }}
                class={`flex-1 font-black uppercase italic ${activeTab() === "qr" ? "bg-yellow-500 text-black" : "text-white/50"}`}
              >
                Get QR Code
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                class="px-16 bg-red-600 text-white hover:bg-red-500"
              >
                <X size={48} />
              </button>
            </div>
            <div class="aspect-[3/2] flex items-center justify-center p-12 bg-black/30">
              <Show when={activeTab() === "photo"}>
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain rounded-[40px] shadow-2xl animate-pop"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                <div class="bg-white p-12 rounded-[60px] flex flex-col items-center gap-10 shadow-2xl scale-125">
                  <canvas ref={qrCanvasRef}></canvas>
                  <p class="text-black font-black text-center uppercase text-xl tracking-tight">
                    Scan for Download
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* STATS MODAL */}
      <Show when={showStats()}>
        <div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-10 animate-pop">
          <div class="w-full max-w-2xl bg-zinc-900 p-20 border-l-[24px] border-yellow-500 rounded-[60px] relative shadow-[0_0_100px_rgba(234,179,8,0.2)]">
            <button
              onClick={() => setShowStats(false)}
              class="absolute top-12 right-12 text-white/30 hover:text-white transition-all"
            >
              <X size={60} />
            </button>
            <h2 class="text-7xl font-black uppercase italic mb-16 text-white border-b-4 border-white/10 pb-8 tracking-tighter">
              Telemetry
            </h2>
            <div class="flex flex-col gap-12 text-center">
              <div class="bg-black/50 p-12 rounded-[50px] border-2 border-white/5">
                <span class="text-2xl font-black text-white/40 uppercase mb-4 block tracking-widest">
                  Total Captures
                </span>
                <span class="text-[12rem] font-black italic tracking-tighter text-white leading-none">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-12 rounded-[50px] border-2 border-white/5">
                <span class="text-2xl font-black text-white/40 uppercase mb-4 block tracking-widest">
                  Total Printed
                </span>
                <span class="text-[12rem] font-black italic text-yellow-500 leading-none">
                  {stats().printed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
