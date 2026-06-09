import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { CandidateProvider } from "@/contexts/CandidateContext";
import Login from "./pages/Login";
import SalaDeGuerra from "./pages/SalaDeGuerra";
import MapaEstrategico from "./pages/MapaEstrategico";
import Territorios from "./pages/Territorios";
import Municipios from "./pages/Municipios";
import Acoes from "./pages/Acoes";
import Campo from "./pages/Campo";
import CampoAcao from "./pages/CampoAcao";
import CampoLiderancas from "./pages/CampoLiderancas";
import CampoLiderancaForm from "./pages/CampoLiderancaForm";
import CampoDashboard from "./pages/CampoDashboard";
import AtivosPoliticos from "./pages/AtivosPoliticos";
import Pesquisas from "./pages/Pesquisas";
import Hierarquia from "./pages/Hierarquia";
import Configuracoes from "./pages/Configuracoes";
import SalaDeCrise from "./pages/SalaDeCrise";
import Proporcional from "./pages/Proporcional";
import TrackingDashboard from "./pages/TrackingDashboard";
import TrackingColeta from "./pages/TrackingColeta";
import Agenda from "./pages/Agenda";
import NotFound from "./pages/NotFound";
import MobnexShowcase from "./pages/MobnexShowcase";
import Chapas from "./pages/Chapas";
import ChapaPartido from "./pages/ChapaPartido";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><AppLayout><SalaDeGuerra /></AppLayout></ProtectedRoute>} />
    <Route path="/mapa" element={<ProtectedRoute><AppLayout><MapaEstrategico /></AppLayout></ProtectedRoute>} />
    <Route path="/territorios" element={<ProtectedRoute><AppLayout><Territorios /></AppLayout></ProtectedRoute>} />
    <Route path="/municipios" element={<ProtectedRoute><AppLayout><Municipios /></AppLayout></ProtectedRoute>} />
    <Route path="/acoes" element={<ProtectedRoute><AppLayout><Acoes /></AppLayout></ProtectedRoute>} />
    <Route path="/campo" element={<ProtectedRoute><AppLayout><Campo /></AppLayout></ProtectedRoute>} />
    <Route path="/campo/acao" element={<ProtectedRoute><AppLayout><CampoAcao /></AppLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas" element={<ProtectedRoute><AppLayout><CampoLiderancas /></AppLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas/novo" element={<ProtectedRoute><AppLayout><CampoLiderancaForm /></AppLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas/:id" element={<ProtectedRoute><AppLayout><CampoLiderancaForm /></AppLayout></ProtectedRoute>} />
    <Route path="/campo/dashboard" element={<ProtectedRoute><AppLayout><CampoDashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/ativos" element={<ProtectedRoute><AppLayout><AtivosPoliticos /></AppLayout></ProtectedRoute>} />
    <Route path="/pesquisas" element={<ProtectedRoute><AppLayout><Pesquisas /></AppLayout></ProtectedRoute>} />
    <Route path="/hierarquia" element={<ProtectedRoute><AppLayout><Hierarquia /></AppLayout></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
    <Route path="/sala-de-crise" element={<ProtectedRoute><AppLayout><SalaDeCrise /></AppLayout></ProtectedRoute>} />
    <Route path="/proporcional" element={<ProtectedRoute><AppLayout><Proporcional /></AppLayout></ProtectedRoute>} />
    <Route path="/tracking" element={<ProtectedRoute><AppLayout><TrackingDashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/agenda" element={<ProtectedRoute><AppLayout><Agenda /></AppLayout></ProtectedRoute>} />
    <Route path="/chapas" element={<ProtectedRoute><AppLayout><Chapas /></AppLayout></ProtectedRoute>} />
    <Route path="/chapas/:party" element={<ProtectedRoute><AppLayout><ChapaPartido /></AppLayout></ProtectedRoute>} />
    <Route path="/tracking/coleta/:shareCode" element={<ProtectedRoute><TrackingColeta /></ProtectedRoute>} />
    <Route path="/mobnex" element={<ProtectedRoute><MobnexShowcase /></ProtectedRoute>} />
    {/* Legacy redirects */}
    <Route path="/alertas" element={<ProtectedRoute><AppLayout><SalaDeCrise /></AppLayout></ProtectedRoute>} />
    <Route path="/inteligencia" element={<ProtectedRoute><AppLayout><SalaDeCrise /></AppLayout></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["dark", "light"]}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CandidateProvider>
              <CampaignProvider>
                <AppRoutes />
              </CampaignProvider>
            </CandidateProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
