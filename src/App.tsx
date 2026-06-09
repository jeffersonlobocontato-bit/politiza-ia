import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleAwareLayout } from "@/components/layout/RoleAwareLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { CandidateProvider } from "@/contexts/CandidateContext";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<ProtectedRoute><RoleAwareLayout><SalaDeGuerra /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/mapa" element={<ProtectedRoute><RoleAwareLayout><MapaEstrategico /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/territorios" element={<ProtectedRoute><RoleAwareLayout><Territorios /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/municipios" element={<ProtectedRoute><RoleAwareLayout><Municipios /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/acoes" element={<ProtectedRoute><RoleAwareLayout><Acoes /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo" element={<ProtectedRoute><RoleAwareLayout><Campo /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo/acao" element={<ProtectedRoute><RoleAwareLayout><CampoAcao /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas" element={<ProtectedRoute><RoleAwareLayout><CampoLiderancas /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas/novo" element={<ProtectedRoute><RoleAwareLayout><CampoLiderancaForm /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo/liderancas/:id" element={<ProtectedRoute><RoleAwareLayout><CampoLiderancaForm /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/campo/dashboard" element={<ProtectedRoute><RoleAwareLayout><CampoDashboard /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/ativos" element={<ProtectedRoute><RoleAwareLayout><AtivosPoliticos /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/pesquisas" element={<ProtectedRoute><RoleAwareLayout><Pesquisas /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/hierarquia" element={<ProtectedRoute><RoleAwareLayout><Hierarquia /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><RoleAwareLayout><Configuracoes /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/sala-de-crise" element={<ProtectedRoute><RoleAwareLayout><SalaDeCrise /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/proporcional" element={<ProtectedRoute><RoleAwareLayout><Proporcional /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/tracking" element={<ProtectedRoute><RoleAwareLayout><TrackingDashboard /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/agenda" element={<ProtectedRoute><RoleAwareLayout><Agenda /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/chapas" element={<ProtectedRoute><RoleAwareLayout><Chapas /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/chapas/:party" element={<ProtectedRoute><RoleAwareLayout><ChapaPartido /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/tracking/coleta/:shareCode" element={<ProtectedRoute><TrackingColeta /></ProtectedRoute>} />
    <Route path="/mobnex" element={<ProtectedRoute><MobnexShowcase /></ProtectedRoute>} />
    {/* Legacy redirects */}
    <Route path="/alertas" element={<ProtectedRoute><RoleAwareLayout><SalaDeCrise /></RoleAwareLayout></ProtectedRoute>} />
    <Route path="/inteligencia" element={<ProtectedRoute><RoleAwareLayout><SalaDeCrise /></RoleAwareLayout></ProtectedRoute>} />
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
