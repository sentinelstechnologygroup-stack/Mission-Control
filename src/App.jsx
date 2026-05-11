// /src/App.jsx
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import AppShell from "./components/mission-control/AppShell";
import Home from "./pages/Home";
import Operations from "./pages/Operations";
import Agents from "./pages/Agents";
import Missions from "./pages/Missions";
import Approvals from "./pages/Approvals";
import Intelligence from "./pages/Intelligence";
import Knowledge from "./pages/Knowledge";
import Security from "./pages/Security";
import System from "./pages/System";
import Nettie from "./pages/Nettie";
import CalendarPage from "./pages/CalendarPage";
import DepartmentPage from "./pages/DepartmentPage";
import CostsPage from "./pages/CostsPage";
import ReportsPage from "./pages/ReportsPage";
import QaPage from "./pages/QaPage";
import DecisionsPage from "./pages/DecisionsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import ProjectsPage from "./pages/ProjectsPage";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/nettie" element={<Nettie />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/security" element={<Security />} />
            <Route path="/system" element={<System />} />
            <Route path="/departments/:departmentId" element={<DepartmentPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/costs" element={<CostsPage />} />
            <Route path="/qa" element={<QaPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;