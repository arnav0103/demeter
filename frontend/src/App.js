import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { FarmDataProvider } from "./hooks/useFarmData";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import CropDetails from "./pages/CropDetails";
import AgentControl from "./pages/AgentControl";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";

function App() {
  return (
    <FarmDataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/control" element={<AgentControl />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crop/:cropId" element={<CropDetails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </Router>
    </FarmDataProvider>
  );
}

export default App;
