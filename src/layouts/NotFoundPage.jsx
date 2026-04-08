import { useNavigate } from "@solidjs/router";
import { AlertCircle, ChevronLeft, ZapOff } from "lucide-solid";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleBackHome = () => {
    // Karena lo udah bersihin App.jsx, '/' harusnya lari ke Photobooth
    navigate("/", { replace: true });
  };

  return (
    <div
      class="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden p-6 bg-black italic text-white"
      style={{ "font-family": "DenzaRegular" }}
    >
      {/* Decorative Warning Lines */}
      <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-900/20 to-transparent"></div>
      <div class="absolute bottom-10 left-10 text-[15rem] font-black opacity-[0.03] select-none pointer-events-none">
        LOST
      </div>

      {/* Konten utama */}
      <div class="flex flex-col items-center text-center z-10 animate-pop">
        <div class="relative mb-8">
          <div class="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse"></div>
          <div class="bg-zinc-900 p-8 rounded-[32px] border-2 border-red-600 relative">
            <ZapOff size={80} class="text-red-600" />
          </div>
        </div>

        <h1 class="text-[120px] font-black leading-none tracking-tighter mb-2 text-white">
          404
        </h1>

        <div class="space-y-3 mb-12">
          <p class="text-3xl font-black uppercase italic tracking-tighter text-red-600">
            Signal Terminated
          </p>
          <div class="h-1 w-24 bg-yellow-500 mx-auto"></div>
          <p class="text-white/50 font-bold max-w-[450px] uppercase text-[10px] tracking-[0.3em] leading-relaxed not-italic">
            Unit out of range. Jalur transmisi yang Anda tuju tidak ditemukan
            dalam koordinat sistem Kayaba.
          </p>
        </div>

        <button
          onClick={handleBackHome}
          class="flex items-center gap-4 bg-white text-black font-black py-5 px-12 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-95 uppercase tracking-tighter text-xl hover:bg-yellow-500 hover:scale-105"
        >
          <ChevronLeft size={24} stroke-width={3} /> Re-Initialize System
        </button>
      </div>

      <style>{`
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop { animation: popUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
}
