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
import frameImgPath from "../assets/img/frame.png"; // Import frame assets

export default function Photobooth() {
  const API_BASE = "http://localhost:8000";

  const [photo, setPhoto] = createSignal(null);
  const [gallery, setGallery] = createSignal([]);
  const [countdown, setCountdown] = createSignal(null);
  const [showStats, setShowStats] = createSignal(false);
  const [showGallery, setShowGallery] = createSignal(false);
  const [stats, setStats] = createSignal({ taken: 0, printed: 0 });
  const [previewItem, setPreviewItem] = createSignal(null);
  const [activeTab, setActiveTab] = createSignal("photo");
  const [currentQR, setCurrentQR] = createSignal("");

  let videoRef;

  const playAudio = (path) => {
    const audio = new Audio(path);
    audio.play().catch((err) => console.warn("Audio play blocked:", path));
  };

  const fetchStatistics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/statistics`);
      const data = await res.json();
      if (data.statistics) {
        setStats({
          taken: data.statistics.photo_count || 0,
          printed: data.statistics.print_count || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGallery = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/all-photos-and-generated-qrs`);
      const data = await res.json();
      if (data.paths) {
        // MAPPING DATA AGAR KONSISTEN DENGAN UI
        const mappedGallery = data.paths.map((item) => ({
          src: item.result_photo_url,
          qr: item.qr_code_url,
        }));
        setGallery(mappedGallery);
      }
    } catch (err) {
      console.error(err);
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

  const uploadPhoto = async (base64) => {
    try {
      const formData = new FormData();
      const photoBlob = base64ToBlob(base64);
      formData.append("photo", photoBlob, `capture-${Date.now()}.png`);
      formData.append("framing_option_int", "0");

      const res = await fetch(
        `${API_BASE}/api/download-and-get-download-path`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (res.ok) {
        await fetchStatistics();
        await fetchGallery();
      }
    } catch (err) {
      console.error(err);
    }
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
    setPhoto(null);
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

    // 1. Draw Photo (Mirroring)
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

    // 2. Draw Frame Overlay
    const frameImg = new Image();
    frameImg.src = frameImgPath;
    await new Promise((resolve) => {
      frameImg.onload = resolve;
    });
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

    // 3. Draw QR Watermark
    const qrSize = Math.floor(canvas.height * 0.18);
    const padding = 30;
    const qrText = `https://gallery.bydiims2026.com/photo-${Date.now()}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      width: qrSize,
      margin: 1,
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => {
      qrImg.onload = resolve;
    });

    ctx.fillStyle = "white";
    ctx.fillRect(
      canvas.width - qrSize - padding - 5,
      canvas.height - qrSize - padding - 5,
      qrSize + 10,
      qrSize + 10,
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
    QRCode.toDataURL(qrText, { width: 1024, margin: 2 }).then((res) =>
      setCurrentQR(res),
    );
    playAudio("/sfx/shutter.mp3");
  };

  // --- FIX PRINT: Nunggu Load & CSS Presisi ---
  const handleNativePrint = (imgUrl) => {
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
            img.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
  };

  return (
    <div class="fixed inset-0 w-full h-full bg-black overflow-hidden p-6 md:p-10 italic font-sans flex flex-col text-white select-none">
      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eab308; border-radius: 10px; }
        .standard-btn { border-radius: 16px; transition: all 0.2s ease; overflow: hidden; }
      `}</style>

      {/* HEADER */}
      <div class="mb-8 flex justify-between items-center border-b-2 border-yellow-500 pb-4">
        <div class="flex items-center gap-4">
          <Zap size={24} class="text-yellow-500" fill="currentColor" />
          <h1 class="text-5xl font-black uppercase tracking-tighter italic leading-none">
            PHOTO{" "}
            <span class="text-yellow-500 font-light">
              BOOTH{" "}
              <span class="text-xs not-italic bg-white/10 px-2 py-1 rounded ml-2 text-white/50 font-bold">
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

      {/* MAIN VIEW */}
      <div class="flex-1 flex gap-10 items-center justify-center min-h-0">
        <div
          class={`relative aspect-[3/2] h-full max-h-full bg-zinc-900 border-2 overflow-hidden transition-all duration-500 rounded-[32px] ${photo() ? "border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.2)]" : "border-white/10"}`}
          style={{ width: "auto", "flex-shrink": "0" }}
        >
          <video
            ref={videoRef}
            autoplay
            class={`w-full h-full object-cover ${photo() ? "hidden" : "block"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          <Show when={photo()}>
            <img src={photo()} class="w-full h-full object-cover animate-pop" />
          </Show>
          <Show when={countdown() !== null}>
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
              <span class="text-[20rem] font-black text-yellow-500 animate-pulse italic leading-none">
                {countdown()}
              </span>
            </div>
          </Show>
        </div>

        <div class="w-72 flex flex-col gap-5 h-full py-4">
          <Show
            when={!photo()}
            fallback={
              <>
                <button
                  onClick={() => setPhoto(null)}
                  class="flex-1 bg-zinc-800 hover:bg-red-700 text-white flex flex-col items-center justify-center gap-2 border-b-8 border-red-900 standard-btn"
                >
                  <RotateCcw size={40} />
                  <span class="font-black uppercase text-xl italic">
                    Retake
                  </span>
                </button>
                <button
                  onClick={() => {
                    uploadPhoto(photo());
                    setPhoto(null);
                  }}
                  class="flex-1 bg-zinc-100 hover:bg-white text-black flex flex-col items-center justify-center gap-2 border-b-8 border-zinc-400 standard-btn"
                >
                  <Save size={40} />
                  <span class="font-black uppercase text-xl italic text-zinc-600">
                    Save Only
                  </span>
                </button>
                <button
                  onClick={async () => {
                    const current = photo();
                    await uploadPhoto(current);
                    handleNativePrint(current);
                    setPhoto(null);
                  }}
                  class="flex-[1.8] bg-yellow-500 hover:bg-yellow-400 text-black flex flex-col items-center justify-center gap-3 border-b-8 border-yellow-700 shadow-xl standard-btn"
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
              <h2 class="text-4xl font-black italic uppercase tracking-tighter">
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
                  <div class="group relative aspect-[3/2] bg-zinc-900 border-2 border-white/5 hover:border-yellow-500 overflow-hidden shadow-2xl rounded-3xl">
                    <img
                      src={item.src}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-8">
                      <button
                        onClick={() => {
                          setPreviewItem(item);
                          setActiveTab("photo");
                        }}
                        class="bg-white text-black p-5 rounded-full hover:scale-110 shadow-xl"
                      >
                        <Eye size={30} />
                      </button>
                      <button
                        onClick={() => handleNativePrint(item.src)}
                        class="bg-yellow-500 text-black p-5 rounded-full hover:scale-110 shadow-xl"
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
          <div
            class="relative flex flex-col bg-zinc-900 border-2 border-white/10 shadow-2xl rounded-[40px] overflow-hidden"
            style={{ width: "80vw", "max-width": "1200px" }}
          >
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
            <div class="aspect-[3/2] flex items-center justify-center p-6 bg-black/50 overflow-hidden">
              <Show when={activeTab() === "photo"}>
                {/* PAKAI src DARI MAPPING GALLERY */}
                <img
                  src={previewItem().src}
                  class="w-full h-full object-contain shadow-2xl animate-pop rounded-xl"
                />
              </Show>
              <Show when={activeTab() === "qr"}>
                <div class="bg-white p-12 rounded-[40px] shadow-2xl animate-pop">
                  {/* PAKAI qr DARI MAPPING GALLERY */}
                  <img
                    src={previewItem().qr}
                    class="w-[300px] h-[300px] md:w-[450px] md:h-[450px]"
                  />
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
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 italic block text-zinc-500">
                  Total Captured
                </span>
                <span class="text-8xl font-black italic leading-none">
                  {stats().taken}
                </span>
              </div>
              <div class="bg-black/50 p-10 border border-white/5 rounded-[24px]">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 italic block text-zinc-500">
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
