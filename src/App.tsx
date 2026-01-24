import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Call1 from "./pages/Call1";
import Call2 from "./pages/Call2";
import Contacts from "./pages/Contacts";
import Courses from "./pages/Courses";
import MyCourses from "./pages/MyCourses";
import Import from "./pages/Import";
import Metrics from "./pages/Metrics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/call1" element={<Call1 />} />
            <Route path="/call2" element={<Call2 />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/import" element={<Import />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
