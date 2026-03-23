import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import SalaDeGuerra from "./pages/SalaDeGuerra";
import MapaEstrategico from "./pages/MapaEstrategico";
import Territorios from "./pages/Territorios";
import Acoes from "./pages/Acoes";
import Campo from "./pages/Campo";
import AtivosPoliticos from "./pages/AtivosPoliticos";
import Pesquisas from "./pages/Pesquisas";
import Inteligencia from "./pages/Inteligencia";
import Hierarquia from "./pages/Hierarquia";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<AppLayout><SalaDeGuerra /></AppLayout>} />
    <Route path="/mapa" element={<AppLayout><MapaEstrategico /></AppLayout>} />
    <Route path="/territorios" element={<AppLayout><Territorios /></AppLayout>} />
    <Route path="/acoes" element={<AppLayout><Acoes /></AppLayout>} />
    <Route path="/campo" element={<AppLayout><Campo /></AppLayout>} />
    <Route path="/ativos" element={<AppLayout><AtivosPoliticos /></AppLayout>} />
    <Route path="/pesquisas" element={<AppLayout><Pesquisas /></AppLayout>} />
    <Route path="/inteligencia" element={<AppLayout><Inteligencia /></AppLayout>} />
    <Route path="/hierarquia" element={<AppLayout><Hierarquia /></AppLayout>} />
    <Route path="/configuracoes" element={<AppLayout><div className="p-6 text-muted-foreground">Configurações em desenvolvimento.</div></AppLayout>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
