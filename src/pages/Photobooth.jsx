import { createSignal, onMount, For, Show, Switch, Match } from "solid-js";
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

  // --- LOGIC HANDLE YES ---
  const handleUsePhoto = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      const photoBlob = base64ToBlob(photo());
      formData.append("photo", photoBlob, `capture-${Date.now()}.png`);
      formData.append("framing_option_int", "0");

      const res = await fetch(
        `${BASE_URL}/api/download-and-get-download-path`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (res.ok) {
        // AMBIL HASIL DARI ENDPOINT GETRESULTPATH
        const resPreview = await fetch(`${BASE_URL}/api/getresultpath`);
        const dataPreview = await resPreview.json();

        if (dataPreview.photo) {
          // Parsing nama file (buang results/photos/result/)
          const fileName = dataPreview.photo.split(/[\\/]/).pop();
          // Set hasil final dari BE untuk di preview di layar
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
    const targetRatio = 3 / 2;
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
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden p-6 md:p-10 italic font-sans flex flex-col text-white select-none">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes shimmer { 0% { background-position: -468px 0 } 100% { background-position: 468px 0 } }
        .animate-pop { animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .skeleton { background: #18181b; background-image: linear-gradient(to right, #18181b 0%, #27272a 20%, #18181b 40%, #18181b 100%); background-repeat: no-repeat; background-size: 800px 104px; animation: shimmer 1.5s linear infinite forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eab308; border-radius: 10px; }
        .standard-btn { border-radius: 16px; transition: all 0.2s ease; overflow: hidden; }
        .loader { width: 48px; height: 48px; border: 5px solid #FFF; border-bottom-color: #eab308; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } } 
      `}</style>

      {/* HEADER */}
      <div class="mb-8 flex justify-between items-center border-b-2 border-yellow-500 pb-4 shrink-0 leading-none">
        <div class="flex items-center gap-4">
          <Zap size={24} class="text-yellow-500" fill="currentColor" />
          <h1 class="text-5xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO{" "}
            <span class="text-yellow-500 font-light">
              BOOTH{" "}
              <span class="text-xs not-italic bg-white/10 px-2 py-1 rounded ml-2 text-white/50 font-bold tracking-normal">
                4R-SYSTEM
              </span>
            </span>
          </h1>
        </div>
        <div class="flex gap-4">
          <button
            onClick={() => {
              fetchStatistics();
              setShowStats(true);
            }}
            class="bg-zinc-900 p-4 border border-white/10 hover:border-yellow-500 transition-all standard-btn"
          >
            <BarChart3 size={24} />
          </button>
          <button
            onClick={() => {
              fetchGallery();
              setShowGallery(true);
            }}
            class="bg-zinc-900 p-4 border border-white/10 hover:border-yellow-500 transition-all standard-btn"
          >
            <LayoutGrid size={24} />
          </button>
        </div>
      </div>

      <div class="flex-1 flex gap-10 items-center justify-center min-h-0">
        <div
          class="relative aspect-[3/2] h-full max-h-full bg-zinc-900 border-2 overflow-hidden transition-all duration-500 rounded-[32px] border-white/10"
          style={{ width: "auto", "flex-shrink": "0" }}
        >
          <video
            ref={videoRef}
            autoplay
            class={`w-full h-full object-cover ${photo() || processedPhoto() ? "hidden" : "block"}`}
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Tampilan 1: Hasil Mentah (FE) */}
          <Show when={photo() && !processedPhoto()}>
            <img
              src={photo()}
              class="w-full h-full object-cover animate-pop border-yellow-500"
            />
            <Show when={isProcessing()}>
              <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                <span class="loader"></span>
                <span class="font-black uppercase italic text-yellow-500 tracking-widest animate-pulse">
                  Syncing Moments...
                </span>
              </div>
            </Show>
          </Show>

          {/* Tampilan 2: Hasil Final (BE - Sudah ada QR) */}
          <Show when={processedPhoto()}>
            <img
              src={processedPhoto()}
              class="w-full h-full object-cover animate-pop border-green-500"
            />
            <div class="absolute top-8 left-8 bg-green-500 text-black font-black px-6 py-2 rounded-full text-sm uppercase italic animate-bounce shadow-2xl">
              Final Ready
            </div>
          </Show>

          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
              <span class="text-[20rem] font-black text-yellow-500 animate-pulse italic leading-none">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        {/* CONTROLS */}
        <div class="w-72 flex flex-col gap-5 h-full py-4 leading-none">
          <Switch>
            {/* Step 1: Default */}
            <Match when={!photo() && !processedPhoto()}>
              <button
                onClick={startCapture}
                class="flex-1 bg-white text-black flex flex-col items-center justify-center gap-6 border-b-8 border-zinc-400 group standard-btn hover:bg-yellow-500 transition-colors"
              >
                <Camera
                  size={80}
                  class="group-hover:scale-110 transition-transform"
                />
                <span class="font-black uppercase text-5xl italic tracking-tighter leading-none">
                  Capture
                </span>
              </button>
            </Match>

            {/* Step 2: Konfirmasi Upload */}
            <Match when={photo() && !processedPhoto()}>
              <div class="flex-1 flex flex-col gap-5">
                <div class="bg-zinc-900 p-4 rounded-2xl border border-white/10 text-center">
                  <p class="font-black italic uppercase text-yellow-500 text-xl leading-tight">
                    Use this photo?
                  </p>
                </div>
                <button
                  onClick={handleUsePhoto}
                  disabled={isProcessing()}
                  class="flex-1 bg-yellow-500 text-black flex flex-col items-center justify-center gap-2 border-b-8 border-yellow-700 standard-btn hover:bg-yellow-400 transition-all"
                >
                  <Check size={48} />
                  <span class="font-black uppercase text-2xl italic">YES</span>
                </button>
                <button
                  onClick={resetCapture}
                  disabled={isProcessing()}
                  class="flex-[0.5] bg-zinc-800 text-white flex flex-col items-center justify-center gap-2 border-b-8 border-red-900 standard-btn hover:bg-red-700 transition-all"
                >
                  <Trash2 size={24} />
                  <span class="font-black uppercase text-sm italic text-red-500">
                    NO, RETAKE
                  </span>
                </button>
              </div>
            </Match>

            {/* Step 3: Print Hasil Akhir */}
            <Match when={processedPhoto()}>
              <div class="flex-1 flex flex-col gap-5 animate-pop">
                <button
                  onClick={() => handleNativePrint(processedPhoto())}
                  class="flex-[2.5] bg-yellow-500 text-black flex flex-col items-center justify-center gap-4 border-b-8 border-yellow-700 shadow-2xl standard-btn hover:bg-yellow-400"
                >
                  <Printer size={70} />
                  <span class="font-black uppercase text-3xl italic leading-none">
                    Print 4R
                  </span>
                </button>
                <button
                  onClick={resetCapture}
                  class="flex-1 bg-zinc-800 text-white flex flex-col items-center justify-center gap-2 border-b-8 border-zinc-600 standard-btn hover:bg-zinc-700"
                >
                  <RotateCcw size={32} />
                  <span class="font-black uppercase text-xl italic text-zinc-400">
                    New Photo
                  </span>
                </button>
              </div>
            </Match>
          </Switch>
        </div>
      </div>

      {/* GALLERY POPUP (Mapping Fix) */}
      <Show when={showGallery()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-lg p-10 animate-pop">
          <div class="w-full max-w-6xl h-full flex flex-col">
            <div class="flex justify-between items-center mb-8 border-b-2 border-yellow-500 pb-4 shrink-0 leading-none">
              <h2 class="text-4xl font-black italic uppercase tracking-tighter text-white">
                Archives
              </h2>
              <button
                onClick={() => setShowGallery(false)}
                class="bg-zinc-900 p-4 border border-white/10 rounded-2xl hover:text-red-500 transition-all text-white"
              >
                <X size={32} />
              </button>
            </div>
            <div class="flex-1 grid grid-cols-3 gap-6 overflow-y-auto pr-6 pb-20 custom-scrollbar">
              <Show when={isLoadingGallery()}>
                <For each={[1, 2, 3, 4, 5, 6]}>
                  {() => (
                    <div class="aspect-[3/2] rounded-[40px] skeleton border-2 border-white/5"></div>
                  )}
                </For>
              </Show>
              <Show when={!isLoadingGallery()}>
                <For each={gallery()}>
                  {(item) => (
                    <div class="group relative aspect-[3/2] bg-zinc-900 border-2 border-white/5 hover:border-yellow-500 overflow-hidden shadow-2xl rounded-[40px] transition-all duration-300">
                      <img
                        src={item.src}
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-8 backdrop-blur-sm">
                        <button
                          onClick={() => {
                            setPreviewItem(item);
                            setActiveTab("photo");
                          }}
                          class="bg-white text-black p-5 rounded-full hover:scale-110 shadow-xl transition-all"
                        >
                          <Eye size={30} />
                        </button>
                        <button
                          onClick={() => handleNativePrint(item.src)}
                          class="bg-yellow-500 text-black p-5 rounded-full hover:scale-110 shadow-xl transition-all"
                        >
                          <Printer size={30} />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* PREVIEW MODAL */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 md:p-12 animate-pop">
          <div
            class="relative flex flex-col bg-zinc-900 border-2 border-white/10 shadow-2xl rounded-[40px] overflow-hidden"
            style={{ width: "80vw", "max-width": "1200px" }}
          >
            <div class="flex border-b border-white/10 h-16 shrink-0 bg-zinc-900">
              <button
                onClick={() => setActiveTab("photo")}
                class={`flex-1 flex items-center justify-center gap-4 font-black uppercase italic transition-all ${activeTab() === "photo" ? "bg-white text-black" : "hover:bg-white/5 text-white/50"}`}
              >
                <ImageIcon size={20} /> Photo
              </button>
              <button
                onClick={() => {
                  setActiveTab("qr");
                  setTimeout(
                    () => generateQRInModal(previewItem().downloadUrl),
                    50,
                  );
                }}
                class={`flex-1 flex items-center justify-center gap-4 font-black uppercase italic transition-all ${activeTab() === "qr" ? "bg-yellow-500 text-black" : "hover:bg-white/5 text-white/50"}`}
              >
                <QrIcon size={20} /> Download QR
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                class="px-10 bg-red-600 hover:bg-red-500 transition-colors border-l border-white/10"
              >
                <X size={28} />
              </button>
            </div>
            <div class="aspect-[3/2] flex items-center justify-center p-10 bg-black/50 overflow-hidden relative">
              <Show when={activeTab() === "photo"}>
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain shadow-2xl animate-pop rounded-xl"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                <div class="bg-white p-12 rounded-[40px] shadow-2xl animate-pop flex flex-col items-center gap-6">
                  <canvas ref={qrCanvasRef}></canvas>
                  <div class="flex flex-col items-center gap-2">
                    <p class="text-black font-black text-center uppercase text-sm">
                      Scan to Download to Mobile
                    </p>
                    <a
                      href={previewItem().downloadUrl}
                      target="_blank"
                      class="text-yellow-600 font-bold underline text-xs italic"
                    >
                      Test Link (PC ONLY)
                    </a>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* STATS MODAL */}
      <Show when={showStats()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-pop">
          <div class="w-full max-w-2xl bg-zinc-900 p-12 border-l-8 border-yellow-500 relative shadow-2xl rounded-[32px] text-white">
            <button
              onClick={() => setShowStats(false)}
              class="absolute top-8 right-8 text-white/30 hover:text-white transition-colors text-white"
            >
              <X size={32} />
            </button>
            <h2 class="text-4xl font-black uppercase italic mb-10 pb-4 border-b border-white/5 tracking-tighter text-white leading-none">
              Telemetry
            </h2>
            <div class="grid grid-cols-2 gap-8 text-center leading-none">
              <div class="bg-black/50 p-10 border border-white/5 rounded-[24px]">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block leading-none">
                  Captured
                </span>
                <span class="text-8xl font-black italic leading-none tracking-tighter">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-10 border border-white/5 rounded-[24px]">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block leading-none">
                  Printed
                </span>
                <span class="text-8xl font-black italic text-yellow-500 leading-none tracking-tighter">
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
