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
      QRCode.toCanvas(qrCanvasRef, url, { width: 300, margin: 2 }, (err) => {
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
          video: { width: 1080, height: 1920 },
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
    const targetRatio = 2 / 3; // PORTRAIT RATIO

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
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);

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
            @page { size: 10.3cm 15.4cm portrait; margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; }
            img { width: 10.3cm; height: 15.4cm; object-fit: cover; }
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
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden p-4 md:p-6 italic font-sans flex flex-col text-white select-none">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .standard-btn { border-radius: 24px; transition: all 0.2s ease; overflow: hidden; }
        .loader { width: 48px; height: 48px; border: 5px solid #FFF; border-bottom-color: #eab308; border-radius: 50%; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>

      {/* HEADER PORTRAIT OPTIMIZED */}
      <div class="mb-4 flex justify-between items-center border-b-2 border-yellow-500 pb-3 shrink-0">
        <div class="flex items-center gap-3">
          <Zap size={20} class="text-yellow-500" fill="currentColor" />
          <h1 class="text-3xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO <span class="text-yellow-500 font-light">BOOTH</span>
          </h1>
        </div>
        <div class="flex gap-2">
          <button
            onClick={() => {
              fetchStatistics();
              setShowStats(true);
            }}
            class="bg-zinc-900 p-3 border border-white/10 standard-btn hover:border-yellow-500"
          >
            <BarChart3 size={20} />
          </button>
          <button
            onClick={() => {
              fetchGallery();
              setShowGallery(true);
            }}
            class="bg-zinc-900 p-3 border border-white/10 standard-btn hover:border-yellow-500"
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>

      {/* MAIN PORTRAIT LAYOUT (VERTICAL STACK) */}
      <div class="flex-1 flex flex-col gap-4 items-center justify-center min-h-0">
        {/* PREVIEW CONTAINER */}
        <div class="relative aspect-[2/3] w-full max-w-[450px] max-h-[70vh] bg-zinc-900 border-2 overflow-hidden transition-all duration-500 rounded-[40px] border-white/10 shadow-2xl">
          <video
            ref={videoRef}
            autoplay
            class={`w-full h-full object-cover ${photo() || processedPhoto() ? "hidden" : "block"}`}
            style={{ transform: "scaleX(-1)" }}
          />

          <Show when={photo() && !processedPhoto()}>
            <img src={photo()} class="w-full h-full object-cover animate-pop" />
            <Show when={isProcessing()}>
              <div class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
                <span class="loader"></span>
                <span class="font-black uppercase italic text-yellow-500 tracking-widest animate-pulse text-sm">
                  Syncing...
                </span>
              </div>
            </Show>
          </Show>

          <Show when={processedPhoto()}>
            <img
              src={processedPhoto()}
              class="w-full h-full object-cover animate-pop"
            />
            <div class="absolute top-6 left-6 bg-green-500 text-black font-black px-4 py-1.5 rounded-full text-xs uppercase italic animate-bounce shadow-xl">
              Ready
            </div>
          </Show>

          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <span class="text-[12rem] font-black text-yellow-500 animate-pulse italic">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        {/* CONTROLS (BOTTOM) */}
        <div class="w-full max-w-[450px] h-32 flex gap-4 shrink-0">
          <Switch>
            <Match when={!photo() && !processedPhoto()}>
              <button
                onClick={startCapture}
                class="flex-1 bg-white text-black flex items-center justify-center gap-4 border-b-8 border-zinc-400 standard-btn hover:bg-yellow-500 transition-colors"
              >
                <Camera size={40} />
                <span class="font-black uppercase text-3xl italic tracking-tighter">
                  Capture
                </span>
              </button>
            </Match>

            <Match when={photo() && !processedPhoto()}>
              <div class="flex-1 flex gap-3">
                <button
                  onClick={handleUsePhoto}
                  disabled={isProcessing()}
                  class="flex-[2] bg-yellow-500 text-black flex items-center justify-center gap-3 border-b-8 border-yellow-700 standard-btn"
                >
                  <Check size={32} />
                  <span class="font-black uppercase text-2xl italic">YES</span>
                </button>
                <button
                  onClick={resetCapture}
                  disabled={isProcessing()}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-3 border-b-8 border-red-900 standard-btn"
                >
                  <Trash2 size={24} class="text-red-500" />
                  <span class="font-black uppercase text-xs italic">
                    RETAKE
                  </span>
                </button>
              </div>
            </Match>

            <Match when={processedPhoto()}>
              <div class="flex-1 flex gap-3 animate-pop">
                <button
                  onClick={() => handleNativePrint(processedPhoto())}
                  class="flex-[2] bg-yellow-500 text-black flex items-center justify-center gap-3 border-b-8 border-yellow-700 standard-btn"
                >
                  <Printer size={40} />
                  <span class="font-black uppercase text-2xl italic">
                    PRINT
                  </span>
                </button>
                <button
                  onClick={resetCapture}
                  class="flex-1 bg-zinc-800 text-white flex items-center justify-center gap-3 border-b-8 border-zinc-600 standard-btn"
                >
                  <RotateCcw size={24} />
                  <span class="font-black uppercase text-xs italic text-zinc-400">
                    NEW
                  </span>
                </button>
              </div>
            </Match>
          </Switch>
        </div>
      </div>

      {/* GALLERY MODAL (Adjusted for Portrait) */}
      <Show when={showGallery()}>
        <div class="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-xl p-6 animate-pop">
          <div class="flex justify-between items-center mb-6 border-b-2 border-yellow-500 pb-4 leading-none">
            <h2 class="text-3xl font-black italic uppercase text-white">
              Archives
            </h2>
            <button
              onClick={() => setShowGallery(false)}
              class="text-white/50 hover:text-red-500 transition-all"
            >
              <X size={32} />
            </button>
          </div>
          <div class="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pb-10">
            <For each={gallery()}>
              {(item) => (
                <div class="group relative aspect-[2/3] bg-zinc-900 border border-white/10 rounded-[30px] overflow-hidden">
                  <img
                    src={item.src}
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-4 backdrop-blur-sm">
                    <button
                      onClick={() => {
                        setPreviewItem(item);
                        setActiveTab("photo");
                      }}
                      class="bg-white text-black p-4 rounded-full"
                    >
                      <Eye size={24} />
                    </button>
                    <button
                      onClick={() => handleNativePrint(item.src)}
                      class="bg-yellow-500 text-black p-4 rounded-full"
                    >
                      <Printer size={24} />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* PREVIEW MODAL (Optimized for Portrait Preview) */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-pop">
          <div class="relative flex flex-col bg-zinc-900 border border-white/10 rounded-[40px] overflow-hidden w-full max-w-[400px]">
            <div class="flex border-b border-white/10 h-14 bg-zinc-900">
              <button
                onClick={() => setActiveTab("photo")}
                class={`flex-1 font-black uppercase italic text-xs ${activeTab() === "photo" ? "bg-white text-black" : "text-white/50"}`}
              >
                Photo
              </button>
              <button
                onClick={() => {
                  setActiveTab("qr");
                  setTimeout(
                    () => generateQRInModal(previewItem().downloadUrl),
                    50,
                  );
                }}
                class={`flex-1 font-black uppercase italic text-xs ${activeTab() === "qr" ? "bg-yellow-500 text-black" : "text-white/50"}`}
              >
                Download QR
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                class="px-6 bg-red-600 text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div class="aspect-[2/3] flex items-center justify-center p-6 bg-black/30">
              <Show when={activeTab() === "photo"}>
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain rounded-lg animate-pop"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                <div class="bg-white p-6 rounded-[30px] flex flex-col items-center gap-4">
                  <canvas ref={qrCanvasRef}></canvas>
                  <p class="text-black font-black text-center uppercase text-[10px]">
                    Scan to Download
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* TELEMETRY MODAL */}
      <Show when={showStats()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-pop">
          <div class="w-full max-w-sm bg-zinc-900 p-8 border-l-4 border-yellow-500 rounded-[32px] relative shadow-2xl">
            <button
              onClick={() => setShowStats(false)}
              class="absolute top-6 right-6 text-white/30 hover:text-white"
            >
              <X size={24} />
            </button>
            <h2 class="text-2xl font-black uppercase italic mb-6 text-white">
              Telemetry
            </h2>
            <div class="flex flex-col gap-4 text-center">
              <div class="bg-black/50 p-6 rounded-[24px] border border-white/5">
                <span class="text-[10px] font-black text-white/40 uppercase mb-2 block">
                  Captured
                </span>
                <span class="text-6xl font-black italic tracking-tighter text-white">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-6 rounded-[24px] border border-white/5">
                <span class="text-[10px] font-black text-white/40 uppercase mb-2 block">
                  Printed
                </span>
                <span class="text-6xl font-black italic text-yellow-500">
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
