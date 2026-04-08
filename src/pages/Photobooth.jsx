import { createSignal, onMount, For, Show } from "solid-js";
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
  QrCode,
} from "lucide-solid";

export default function Photobooth() {
  // --- States ---
  const [photo, setPhoto] = createSignal(null);
  const [gallery, setGallery] = createSignal([]);
  const [countdown, setCountdown] = createSignal(null);
  const [showStats, setShowStats] = createSignal(false);
  const [showGallery, setShowGallery] = createSignal(false);
  const [stats, setStats] = createSignal({ taken: 0, printed: 0 });

  // Preview Modal States
  const [previewItem, setPreviewItem] = createSignal(null);
  const [activeTab, setActiveTab] = createSignal("photo");
  const [currentQR, setCurrentQR] = createSignal("");

  let videoRef;
  const sfxCapture = new Audio("/sfx/shutter.mp3");
  const sfxCount = new Audio("/sfx/countdown.mp3");

  // --- Camera Initialization ---
  onMount(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
      });
      videoRef.srcObject = s;
    } catch (err) {
      console.error("Camera access denied", err);
    }
  });

  const generateQRBase64 = async (text) => {
    try {
      return await QRCode.toDataURL(text, { width: 1024, margin: 2 });
    } catch (err) {
      return "";
    }
  };

  const startCapture = () => {
    setPhoto(null);
    setCountdown(3);
    const timer = setInterval(() => {
      if (countdown() > 1) {
        sfxCount.play();
        setCountdown((prev) => prev - 1);
      } else {
        clearInterval(timer);
        captureProcess();
        setCountdown(null);
      }
    }, 1000);
    sfxCount.play();
  };

  // --- Core Capture Logic (Crop 3:2 / 4R) ---
  const captureProcess = async () => {
    const canvas = document.createElement("canvas");
    const videoWidth = videoRef.videoWidth;
    const videoHeight = videoRef.videoHeight;

    // Target 4R Ratio (3:2)
    const targetRatio = 3 / 2;
    let renderWidth, renderHeight;

    if (videoWidth / videoHeight > targetRatio) {
      renderHeight = videoHeight;
      renderWidth = videoHeight * targetRatio;
    } else {
      renderWidth = videoWidth;
      renderHeight = videoWidth / targetRatio;
    }

    canvas.width = Math.floor(renderWidth);
    canvas.height = Math.floor(renderHeight);
    const ctx = canvas.getContext("2d");

    // Mirroring & Center Crop
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    const startX = (videoWidth - renderWidth) / 2;
    const startY = (videoHeight - renderHeight) / 2;

    ctx.drawImage(
      videoRef,
      startX,
      startY,
      renderWidth,
      renderHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // QR Overlay (Watermark)
    const qrSize = Math.floor(canvas.height * 0.18);
    const padding = 30;
    const qrText = `https://isuzu-booth.com/photo-${Date.now()}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      width: qrSize,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });

    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.fillStyle = "white";
      const bgPadding = 8;
      ctx.fillRect(
        canvas.width - qrSize - padding - bgPadding,
        canvas.height - qrSize - padding - bgPadding,
        qrSize + bgPadding * 2,
        qrSize + bgPadding * 2,
      );

      ctx.drawImage(
        qrImg,
        canvas.width - qrSize - padding,
        canvas.height - qrSize - padding,
        qrSize,
        qrSize,
      );

      const finalPhoto = canvas.toDataURL("image/png", 1.0);
      setPhoto(finalPhoto);
      generateQRBase64(qrText).then((res) => setCurrentQR(res));
    };
    qrImg.src = qrDataUrl;
    sfxCapture.play();
  };

  const saveToGallery = (img) => {
    if (photo() === img) {
      setStats((prev) => ({ ...prev, taken: prev.taken + 1 }));
      setPhoto(null);
    }
    if (!gallery().some((item) => item.src === img)) {
      setGallery([{ src: img, qr: currentQR() }, ...gallery()]);
    }
  };

  // --- Fixed Print Logic (15.4x10.3) ---
  const handleNativePrint = (img) => {
    saveToGallery(img);
    setStats((prev) => ({ ...prev, printed: prev.printed + 1 }));

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; }
            img { width: 15.4cm; height: 10.3cm; object-fit: cover; }
          </style>
        </head>
        <body>
          <img src="${img}" onload="setTimeout(() => { window.print(); window.close(); }, 500)">
        </body>
      </html>
    `);
  };

  const handleOpenPreview = (item) => {
    setPreviewItem(item);
    setActiveTab("photo");
  };

  return (
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden p-6 md:p-10 italic font-sans flex flex-col text-white select-none">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eab308; border-radius: 10px; }
        .standard-btn { border-radius: 16px; transition: all 0.2s ease; overflow: hidden; }
        .aspect-4r { aspect-ratio: 3 / 2; }
      `}</style>

      {/* HEADER */}
      <div class="mb-8 flex justify-between items-center border-b-2 border-yellow-500 pb-4">
        <div class="flex items-center gap-4">
          <Zap size={24} class="text-yellow-500" fill="currentColor" />
          <h1 class="text-5xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO{" "}
            <span class="text-yellow-500 font-light">
              BOOTH{" "}
              <span class="text-xs not-italic bg-white/10 px-2 py-1 rounded ml-2 text-white/50 tracking-normal font-bold">
                4R-SYSTEM
              </span>
            </span>
          </h1>
        </div>
        <div class="flex gap-4">
          <button
            onClick={() => setShowStats(true)}
            class="bg-zinc-900 p-4 border border-white/10 hover:border-yellow-500 transition-all standard-btn"
          >
            <BarChart3 size={24} />
          </button>
          <button
            onClick={() => setShowGallery(true)}
            class="bg-zinc-900 p-4 border border-white/10 hover:border-yellow-500 transition-all standard-btn"
          >
            <LayoutGrid size={24} />
          </button>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div class="flex-1 flex gap-10 items-center justify-center min-h-0">
        {/* VIEWPORT - Locked to 3:2 Ratio */}
        <div
          class={`relative aspect-[3/2] h-full max-h-full bg-zinc-900 border-2 overflow-hidden transition-all duration-500 rounded-[32px] ${
            photo()
              ? "border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.2)]"
              : "border-white/10"
          }`}
          style={{
            width: "auto", // Lebar mengikuti tinggi agar rasio 3:2 pas
            "flex-shrink": "0", // Jangan biarkan container ini mengecil secara paksa
          }}
        >
          <video
            ref={videoRef}
            autoplay
            class={`w-full h-full object-cover ${photo() ? "hidden" : "block"}`}
            style={{ transform: "scaleX(-1)" }}
          />

          <Show when={photo()}>
            <img
              src={photo()}
              class="w-full h-full object-cover animate-pop"
              style={{ transform: "none" }}
            />
          </Show>

          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
              <span class="text-[18rem] font-black text-yellow-500 animate-pulse italic leading-none">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        {/* CONTROLS */}
        <div class="w-72 flex flex-col gap-5 h-full py-4">
          <Show
            when={!photo()}
            fallback={
              <>
                <button
                  onClick={() => setPhoto(null)}
                  class="flex-1 bg-zinc-800 hover:bg-red-700 text-white flex flex-col items-center justify-center gap-2 border-b-8 border-red-900 standard-btn transition-colors"
                >
                  <RotateCcw size={40} />
                  <span class="font-black uppercase text-xl italic">
                    Retake
                  </span>
                </button>
                <button
                  onClick={() => saveToGallery(photo())}
                  class="flex-1 bg-zinc-100 hover:bg-white text-black flex flex-col items-center justify-center gap-2 border-b-8 border-zinc-400 standard-btn transition-colors"
                >
                  <Save size={40} />
                  <span class="font-black uppercase text-xl italic text-zinc-600">
                    Save Only
                  </span>
                </button>
                <button
                  onClick={() => handleNativePrint(photo())}
                  class="flex-[1.8] bg-yellow-500 hover:bg-yellow-400 text-black flex flex-col items-center justify-center gap-3 border-b-8 border-yellow-700 shadow-xl standard-btn transition-colors"
                >
                  <Printer size={64} />
                  <span class="font-black uppercase text-3xl italic leading-none">
                    Print 4R
                  </span>
                </button>
              </>
            }
          >
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
          </Show>
        </div>
      </div>

      {/* GALLERY POPUP */}
      <Show when={showGallery()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-lg p-10 animate-pop">
          <div class="w-full max-w-6xl h-full flex flex-col">
            <div class="flex justify-between items-center mb-8 border-b-2 border-yellow-500 pb-4">
              <h2 class="text-4xl font-black italic uppercase">
                Fleet <span class="text-yellow-500 font-light">Archives</span>
              </h2>
              <button
                onClick={() => setShowGallery(false)}
                class="bg-zinc-900 p-4 border border-white/10 rounded-2xl hover:text-red-500 transition-all"
              >
                <X size={32} />
              </button>
            </div>
            <div class="flex-1 grid grid-cols-3 gap-8 overflow-y-auto pr-4 custom-scrollbar">
              <For each={gallery()}>
                {(item) => (
                  <div class="group relative aspect-4r bg-zinc-900 border-2 border-white/5 hover:border-yellow-500 overflow-hidden shadow-2xl rounded-3xl transition-all">
                    <img
                      src={item.src}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-8">
                      <button
                        onClick={() => handleOpenPreview(item)}
                        class="bg-white text-black p-5 rounded-full hover:scale-110 transition-all shadow-xl"
                      >
                        <Eye size={30} />
                      </button>
                      <button
                        onClick={() => handleNativePrint(item.src)}
                        class="bg-yellow-500 text-black p-5 rounded-full hover:scale-110 transition-all shadow-xl"
                      >
                        <Printer size={30} />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* PREVIEW MODAL */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 md:p-12 animate-pop">
          {/* Kunci lebar modal di sini (misal 80vw) supaya nggak berubah pas pindah tab */}
          <div
            class="relative flex flex-col bg-zinc-900 border-2 border-white/10 shadow-2xl rounded-[40px] overflow-hidden"
            style={{ width: "80vw", "max-width": "1200px", height: "auto" }}
          >
            {/* TABS HEADER */}
            <div class="flex border-b border-white/10 h-16 shrink-0">
              <button
                onClick={() => setActiveTab("photo")}
                class={`flex-1 flex items-center justify-center gap-4 font-black uppercase italic transition-all ${activeTab() === "photo" ? "bg-white text-black" : "hover:bg-white/5 text-white/50"}`}
              >
                <ImageIcon size={20} /> Preview Photo
              </button>
              <button
                onClick={() => setActiveTab("qr")}
                class={`flex-1 flex items-center justify-center gap-4 font-black uppercase italic transition-all ${activeTab() === "qr" ? "bg-yellow-500 text-black" : "hover:bg-white/5 text-white/50"}`}
              >
                <QrCode size={20} /> Preview QR
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                class="px-10 bg-red-600 hover:bg-red-500 transition-colors border-l border-white/10"
              >
                <X size={28} />
              </button>
            </div>

            {/* TAB CONTENT - Kunci rasionya di sini supaya area putih/hitamnya sama */}
            <div class="aspect-[3/2] flex items-center justify-center p-6 bg-black/50 overflow-hidden">
              <Show when={activeTab() === "photo"}>
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain shadow-2xl animate-pop rounded-xl"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                {/* QR dibungkus div putih yang tetep proporsional */}
                <div class="w-full h-full flex items-center justify-center">
                  <div class="bg-white p-12 rounded-[40px] shadow-2xl animate-pop">
                    {/* Ukuran QR dikunci biar nggak menuhin layar tapi tetep gede */}
                    <img
                      src={previewItem().qr}
                      class="w-[300px] h-[300px] md:w-[450px] md:h-[450px]"
                    />
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* STATS */}
      <Show when={showStats()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-pop">
          <div class="w-full max-w-2xl bg-zinc-900 p-12 border-l-8 border-yellow-500 relative shadow-2xl rounded-[32px]">
            <button
              onClick={() => setShowStats(false)}
              class="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            <h2 class="text-4xl font-black uppercase italic mb-10 pb-4 border-b border-white/5">
              Fleet Telemetry
            </h2>
            <div class="grid grid-cols-2 gap-8 text-center">
              <div class="bg-black/50 p-10 border border-white/5 rounded-[24px]">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 italic leading-none block">
                  Total Captured
                </span>
                <span class="text-8xl font-black italic leading-none">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-10 border border-white/5 rounded-[24px]">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 italic leading-none block">
                  Total Printed
                </span>
                <span class="text-8xl font-black italic text-yellow-500 leading-none">
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
