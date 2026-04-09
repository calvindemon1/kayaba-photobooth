import { useSearchParams } from "@solidjs/router";

export default function DownloadPage() {
  const [searchParams] = useSearchParams();

  // 1. GANTI INI dengan URL Tunnel Backend lu yang aktif
  const PUBLIC_BACKEND_URL = "https://moments.kayaba50thanniversary.site";

  // 2. Ambil parameter 'photo' dari URL
  // Isinya: /results/photos/result/f2bee822-3e3f-42f2-8032-9289a383bac0.png
  const photoPath = () => searchParams.photo;

  // 3. Kita butuh mapping agar path "/results/photos/result/"
  // menjadi path static yang di-serve backend, misal "/photo-result/"
  const getImageUrl = () => {
    if (!photoPath()) return "";
    const fileName = photoPath().split("/").pop(); // Ambil f2bee822...png
    return `${PUBLIC_BACKEND_URL}/photo-result/${fileName}`;
  };

  return (
    <div class="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <Show when={photoPath()} fallback={<p>No photo found.</p>}>
        <img
          src={getImageUrl()}
          class="max-w-full rounded-lg shadow-2xl border-2 border-yellow-500"
          alt="Your Moment"
        />
        <a
          href={getImageUrl()}
          download="moment.png"
          target="_blank"
          class="mt-8 bg-yellow-500 text-black px-8 py-3 rounded-full font-black uppercase italic"
        >
          Download Image
        </a>
      </Show>
    </div>
  );
}
