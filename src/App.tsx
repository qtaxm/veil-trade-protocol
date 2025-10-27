import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./contexts/Web3Context";
import { FHEProvider } from "./contexts/FHEContext";
import Header from "./components/layout/Header";
import Welcome from "./pages/Welcome";
import CreateBarter from "./pages/CreateBarter";
import MyBarters from "./pages/MyBarters";
import BarterDetail from "./pages/BarterDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FHEProvider>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Header />
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/create" element={<CreateBarter />} />
              <Route path="/my-barters" element={<MyBarters />} />
              <Route path="/barter/:id" element={<BarterDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </Web3Provider>
    </FHEProvider>
  </QueryClientProvider>
);

export default App;
