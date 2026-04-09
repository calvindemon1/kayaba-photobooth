import {
  createSignal,
  onMount,
  Show,
  For,
  createEffect,
  on,
  Switch,
  Match,
} from "solid-js";
import QRCode from "qrcode";
import {
  Camera,
  Printer,
  RotateCcw,
  LayoutGrid,
  BarChart3,
  X,
  Zap,
  Save,
  Eye,
  Image as ImageIcon,
  QrCode as QrIcon,
  Check,
  Trash2,
} from "lucide-solid";
import frameImgPath from "../assets/img/frame.png";

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

  let videoRef;
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

  const fetchGallery = async () => {
    setIsLoadingGallery(true);
    try {
      const [resLocal, resCloud] = await Promise.all([
        fetch(`${BASE_URL}/api/all-local-photos-and-generated-qrs`),
        fetch(`${BASE_URL}/api/all-photos-and-generated-qrs`),
      ]);
      const dataLocal = await resLocal.json();
      const dataCloud = await resCloud.json();

      if (dataLocal.paths && dataCloud.paths) {
        const mappedGallery = dataLocal.paths.map((item, index) => {
          const fileName = item.result_photo_url.split(/[\\/]/).pop();
          const cloudPhotoUrl = dataCloud.paths[index]?.result_photo_url || "";
          return {
            src: `${BASE_URL}/photo-result/${fileName}`,
            downloadUrl: `${DOWNLOAD_PAGE_URL}?photo=${encodeURIComponent(cloudPhotoUrl)}`,
          };
        });
        setGallery(mappedGallery);
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

  const handleUsePhoto = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      const photoBlob = base64ToBlob(photo());
      formData.append("photo", photoBlob, `capture-${Date.now()}.png`);
      formData.append("framing_option_int", "0");

      const res = await fetch(
        `${BASE_URL}/api/download-and-get-download-path`,
        { method: "POST", body: formData },
      );

      if (res.ok) {
        const resPreview = await fetch(`${BASE_URL}/getresultpath`);
        const dataPreview = await resPreview.json();
        if (dataPreview.photo) {
          const fileName = dataPreview.photo.split(/[\\/]/).pop();
          setProcessedPhoto(`${BASE_URL}/photo-result/${fileName}`);
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
    const initCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
        });
        videoRef.srcObject = s;
      } catch (err) {
        console.error(err);
      }
    };
    initCamera();
  });

  const startCapture = () => {
    resetCapture();
    setCountdown(3);
    playAudio("/sfx/countdown.mp3");
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          captureProcess();
          return null;
        }
        playAudio("/sfx/countdown.mp3");
        return prev - 1;
      });
    }, 1000);
  };

  const captureProcess = async () => {
    const canvas = document.createElement("canvas");
    const vW = videoRef.videoWidth;
    const vH = videoRef.videoHeight;
    const targetRatio = 3 / 2; // BALIK KE LANDSCAPE

    let rW, rH;
    if (vW / vH > targetRatio) {
      rH = vH;
      rW = vH * targetRatio;
    } else {
      rW = vW;
      rH = vW / targetRatio;
    }

    canvas.width = Math.floor(rW);
    canvas.height = Math.floor(rH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      videoRef,
      (vW - rW) / 2,
      (vH - rH) / 2,
      rW,
      rH,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const frameImg = new Image();
    frameImg.src = frameImgPath;
    await new Promise((res) => {
      frameImg.onload = res;
    });
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

    setPhoto(canvas.toDataURL("image/png", 1.0));
    playAudio("/sfx/shutter.mp3");
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
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden flex flex-col text-white select-none p-4 italic">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .standard-btn { border-radius: 30px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
        .standard-btn:active { transform: scale(0.95); }
        .loader { width: 64px; height: 64px; border: 8px solid #FFF; border-bottom-color: #eab308; border-radius: 50%; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>

      {/* HEADER */}
      <div class="shrink-0 flex justify-between items-center border-b-4 border-yellow-500 pb-4 mb-4">
        <div class="flex items-center gap-4">
          <Zap
            size={32}
            class="text-yellow-500 animate-pulse"
            fill="currentColor"
          />
          <h1 class="text-5xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO <span class="text-yellow-500 font-light">BOOTH</span>
          </h1>
        </div>
        <div class="flex gap-4">
          <button
            onClick={() => {
              fetchStatistics();
              setShowStats(true);
            }}
            class="bg-zinc-900 p-5 border-2 border-white/10 standard-btn hover:border-yellow-500"
          >
            <BarChart3 size={32} />
          </button>
          <button
            onClick={() => {
              fetchGallery();
              setShowGallery(true);
            }}
            class="bg-zinc-900 p-5 border-2 border-white/10 standard-btn hover:border-yellow-500"
          >
            <LayoutGrid size={32} />
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT (STAY PORTRAIT BUT CONTENT IS LANDSCAPE) */}
      <div class="flex-1 flex flex-col gap-8 items-center justify-center min-h-0">
        {/* PREVIEW CONTAINER (SINKRON KE LANDSCAPE 3:2) */}
        <div class="relative aspect-[3/2] w-full max-w-[95vw] bg-zinc-900 border-4 overflow-hidden rounded-[50px] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <video
            ref={videoRef}
            autoplay
            class={`w-full h-full object-cover ${photo() || processedPhoto() ? "hidden" : "block"}`}
          />

          <Show when={photo() && !processedPhoto()}>
            <img src={photo()} class="w-full h-full object-cover animate-pop" />
            <Show when={isProcessing()}>
              <div class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 backdrop-blur-xl">
                <span class="loader"></span>
                <span class="font-black uppercase italic text-yellow-500 tracking-[0.2em] animate-pulse text-2xl">
                  Processing...
                </span>
              </div>
            </Show>
          </Show>

          <Show when={processedPhoto()}>
            <img
              src={processedPhoto()}
              class="w-full h-full object-cover animate-pop"
            />
            <div class="absolute top-10 left-10 bg-green-500 text-black font-black px-8 py-3 rounded-full text-xl uppercase italic animate-bounce shadow-2xl border-4 border-black">
              READY!
            </div>
          </Show>

          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <span class="text-[18rem] font-black text-yellow-500 animate-ping italic drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        {/* CONTROLS */}
        <div class="w-full max-w-[600px] h-36 flex gap-6 shrink-0 pb-2">
          <Switch>
            <Match when={!photo() && !processedPhoto()}>
              <button
                onClick={startCapture}
                class="flex-1 bg-white text-black flex items-center justify-center gap-6 border-b-[12px] border-zinc-400 standard-btn hover:bg-yellow-500 hover:border-yellow-700 transition-all"
              >
                <Camera size={60} />
                <span class="font-black uppercase text-5xl italic tracking-tighter">
                  Capture
                </span>
              </button>
            </Match>

            <Match when={photo() && !processedPhoto()}>
              <div class="flex-1 flex gap-4">
                <button
                  onClick={handleUsePhoto}
                  disabled={isProcessing()}
                  class="flex-[2] bg-yellow-500 text-black flex items-center justify-center gap-4 border-b-[12px] border-yellow-700 standard-btn shadow-2xl"
                >
                  <Check size={50} />
                  <span class="font-black uppercase text-4xl italic">YES</span>
                </button>
                <button
                  onClick={resetCapture}
                  disabled={isProcessing()}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-4 border-b-[12px] border-red-900 standard-btn"
                >
                  <Trash2 size={32} class="text-red-500" />
                  <span class="font-black uppercase text-xl italic">
                    RETAKE
                  </span>
                </button>
              </div>
            </Match>

            <Match when={processedPhoto()}>
              <div class="flex-1 flex gap-4 animate-pop">
                <button
                  onClick={() => handleNativePrint(processedPhoto())}
                  class="flex-[2.5] bg-yellow-500 text-black flex items-center justify-center gap-6 border-b-[12px] border-yellow-700 standard-btn shadow-[0_0_40px_rgba(234,179,8,0.4)]"
                >
                  <Printer size={60} />
                  <span class="font-black uppercase text-4xl italic">
                    PRINT NOW
                  </span>
                </button>
                <button
                  onClick={resetCapture}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-4 border-b-[12px] border-zinc-600 standard-btn"
                >
                  <RotateCcw size={40} />
                  <span class="font-black uppercase text-2xl italic text-zinc-400">
                    NEW
                  </span>
                </button>
              </div>
            </Match>
          </Switch>
        </div>
      </div>

      {/* MODALS (Archives, Preview, Stats) disesuaikan agar item gallery tetap Landscape */}
      <Show when={showGallery()}>
        <div class="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-2xl p-8 animate-pop">
          <div class="flex justify-between items-center mb-10 border-b-4 border-yellow-500 pb-6">
            <h2 class="text-5xl font-black italic uppercase text-white tracking-tighter">
              Archives
            </h2>
            <button
              onClick={() => setShowGallery(false)}
              class="bg-zinc-800 p-6 rounded-3xl hover:text-red-500 transition-all"
            >
              <X size={48} />
            </button>
          </div>
          <div class="flex-1 grid grid-cols-2 gap-8 overflow-y-auto pb-20 custom-scrollbar">
            <For each={gallery()}>
              {(item) => (
                <div class="group relative aspect-[3/2] bg-zinc-900 border-2 border-white/10 rounded-[50px] overflow-hidden shadow-2xl">
                  <img
                    src={item.src}
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-12 backdrop-blur-md">
                    <button
                      onClick={() => {
                        setPreviewItem(item);
                        setActiveTab("photo");
                      }}
                      class="bg-white text-black p-8 rounded-full hover:scale-110 transition-transform"
                    >
                      <Eye size={48} />
                    </button>
                    <button
                      onClick={() => handleNativePrint(item.src)}
                      class="bg-yellow-500 text-black p-8 rounded-full hover:scale-110 transition-transform"
                    >
                      <Printer size={48} />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* PREVIEW MODAL */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-8 animate-pop">
          <div class="relative flex flex-col bg-zinc-900 border-2 border-white/10 rounded-[60px] overflow-hidden w-full max-w-[900px] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div class="flex border-b-2 border-white/10 h-20 bg-zinc-900">
              <button
                onClick={() => setActiveTab("photo")}
                class={`flex-1 font-black uppercase italic text-xl ${activeTab() === "photo" ? "bg-white text-black" : "text-white/50"}`}
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
                class={`flex-1 font-black uppercase italic text-xl ${activeTab() === "qr" ? "bg-yellow-500 text-black" : "text-white/50"}`}
              >
                Get QR
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                class="px-10 bg-red-600 text-white hover:bg-red-500"
              >
                <X size={32} />
              </button>
            </div>
            <div class="aspect-[3/2] flex items-center justify-center p-8 bg-black/30">
              <Show when={activeTab() === "photo"}>
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain rounded-3xl shadow-2xl animate-pop"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                <div class="bg-white p-10 rounded-[50px] flex flex-col items-center gap-8 shadow-2xl scale-110">
                  <canvas ref={qrCanvasRef}></canvas>
                  <p class="text-black font-black text-center uppercase text-lg tracking-tight">
                    Scan for Mobile Download
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* TELEMETRY */}
      <Show when={showStats()}>
        <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-8 animate-pop">
          <div class="w-full max-w-xl bg-zinc-900 p-16 border-l-[16px] border-yellow-500 rounded-[50px] relative shadow-[0_0_100px_rgba(234,179,8,0.2)]">
            <button
              onClick={() => setShowStats(false)}
              class="absolute top-10 right-10 text-white/30 hover:text-white"
            >
              <X size={48} />
            </button>
            <h2 class="text-5xl font-black uppercase italic mb-12 text-white border-b-2 border-white/10 pb-6 tracking-tighter">
              Telemetry
            </h2>
            <div class="flex flex-col gap-8 text-center">
              <div class="bg-black/50 p-10 rounded-[40px] border-2 border-white/5">
                <span class="text-xl font-black text-white/40 uppercase mb-4 block tracking-widest">
                  Captured
                </span>
                <span class="text-9xl font-black italic tracking-tighter text-white">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-10 rounded-[40px] border-2 border-white/5">
                <span class="text-xl font-black text-white/40 uppercase mb-4 block tracking-widest">
                  Printed
                </span>
                <span class="text-9xl font-black italic text-yellow-500">
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
