import { createSignal } from "solid-js";
import Loading from "./layouts/Loading";
import Photobooth from "./pages/Photobooth";

function App() {
  const [loading, setLoading] = createSignal(true);

  // Simulasi loading sebentar biar transisi smooth
  setTimeout(() => setLoading(false), 1500);

  return (
    <div
      class="w-screen h-screen bg-black text-white overflow-hidden select-none"
      style={{ "font-family": "DenzaRegular" }}
    >
      {loading() ? <Loading /> : <Photobooth />}
    </div>
  );
}

export default App;
