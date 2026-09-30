import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import './App.css';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ClientLogin from './pages/clientlogin';
import ClientMainPage from './pages/clientmainpage';
import ClarityGuide from './pages/ClarityGuide';
import AdvocateDashboard from './pages/AdvocateDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AdvocatesList from './pages/AdvocatesList';
import Adminpage from './pages/Adminpage';
import Contact from './pages/Contact';
import Partners from './pages/Partners';
import AboutUs from './pages/Aboutus';
import AskQuestion from "./pages/Askquestion";
import LegalDocuments from "./pages/LegalDocuments";
import LegalNews from "./pages/LegalNews";
import BareActs from "./pages/BareActs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermOfUse";
import TalkToAdvocate from "./pages/TalkToAdvocate";
import Chatbot from "./pages/Chatbot";
import { getTheme, initTheme } from "./data/themeStore";

function App() {
  const [theme, setAppTheme] = React.useState(getTheme);

  React.useEffect(() => {
    initTheme();
    const handleThemeChange = (e) => {
      setAppTheme(e.detail || getTheme());
    };
    window.addEventListener("law4u_theme_change", handleThemeChange);
    return () => window.removeEventListener("law4u_theme_change", handleThemeChange);
  }, []);

  const location = useLocation();
  const isAdminPortal = location.pathname === '/admin';
  const isAdvocatePortal = location.pathname === '/advocate-dashboard';
  const isAdvocateLogin = location.pathname === '/login';
  const isClientLogin = location.pathname === '/client-login';
  const isClientPortal =
    location.pathname === '/client-dashboard' ||
    location.pathname === '/client-main' ||
    location.pathname === '/client-mainpage' ||
    location.pathname === '/clarity-guide';

  return (
    <div className={`App ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      {!isAdminPortal && !isAdvocatePortal && !isAdvocateLogin && !isClientLogin && !isClientPortal && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/find-lawyer" element={<AdvocatesList />} />
        <Route path="/AdvocatesList" element={<Navigate to="/find-lawyer" replace />} />
        <Route path="/talk-to-advocate" element={<TalkToAdvocate />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/legal-advice" element={<div style={{padding: "100px"}}>Legal Advice Page Content</div>} />
        <Route path="/legal-advice/ask-question" element={<AskQuestion />} />
        <Route path="/legal-advice/documents" element={<LegalDocuments />} />
        <Route path="/legal-advice/bare-acts" element={<BareActs />} />
        <Route path="/legal-advice/news" element={<LegalNews />} />
        <Route path="/aboutus" element={<AboutUs />} />
        <Route path="/Aboutus" element={<Navigate to="/aboutus" replace />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/Partners" element={<Partners />} />
        <Route path="/admin" element={<Adminpage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/client-main" element={<ClientMainPage />} />
        <Route path="/client-mainpage" element={<ClientMainPage />} />
        <Route path="/clarity-guide" element={<ClarityGuide />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/advocate-dashboard" element={<AdvocateDashboard />} />
        <Route path="/download" element={<div style={{padding: "100px"}}>Download Apps Page Content</div>} />
      </Routes>
      <Chatbot />
    </div>
  );
}

export default App;
