import { createSignal, onMount } from "solid-js";
import Loading from "./layouts/Loading";
import Photobooth from "./pages/Photobooth";
import DownloadPage from "./pages/DownloadPage"; // Pastikan lo udah bikin file ini

function App() {
  const [loading, setLoading] = createSignal(true);
  const [route, setRoute] = createSignal(window.location.pathname);

  onMount(() => {
    // Simulasi loading sebentar biar transisi smooth
    setTimeout(() => setLoading(false), 1500);

    // Listener sederhana kalo ada perubahan path (opsional buat local testing)
    const handleLocationChange = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  });

  return (
    <div
      class="w-screen h-screen bg-black text-white overflow-hidden select-none"
      style={{ "font-family": "DenzaRegular" }}
    >
      <Show when={!loading()} fallback={<Loading />}>
        <Switch>
          {/* Cek rute: Kalo path-nya /download, lari ke halaman download */}
          <Match when={route() === "/download"}>
            <DownloadPage />
          </Match>

          {/* Default: Lari ke Photobooth */}
          <Match when={true}>
            <Photobooth />
          </Match>
        </Switch>
      </Show>
    </div>
  );
}

// Import Show dan Switch dari solid-js
import { Show, Switch, Match } from "solid-js";

export default App;
