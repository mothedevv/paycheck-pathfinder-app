import Layout from "./Layout.jsx";
import Bills from "./Bills";
import Debt from "./Debt";
import Home from "./Home";
import Payday from "./Payday";
import Savings from "./Savings";
import Settings from "./Settings";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import ScrollToTop from "../components/ScrollToTop";

const PAGES = {
    Bills: Bills,
    Debt: Debt,
    Home: Home,
    Payday: Payday,
    Savings: Savings,
    Settings: Settings,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <ScrollToTop />
            <Routes>             
                <Route path="/" element={<Home />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/debt" element={<Debt />} />
                <Route path="/home" element={<Home />} />
                <Route path="/payday" element={<Payday />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}