import './index.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import KeyboardDismiss from "@/components/KeyboardDismiss";

function App() {
  return (
    <div className="min-h-[100dvh] bg-[#0d0d1a]">
      <KeyboardDismiss />
      <Pages />
      <Toaster />
    </div>
  );
}

export default App;