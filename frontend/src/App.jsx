// Dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import Pages
import LandingPage from "./pages/LandingPage"
import UserDashboard from "./pages/user/UserDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/*USER ROUTES*/}
        <Route path="/user/dashboard" element={<UserDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;