import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import CategoryPage from "@/pages/CategoryPage";
import StaffManagement from "@/pages/StaffManagement";
import StaffInvite from "@/pages/StaffInvite";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import MyOrders from "./pages/MyOrders";
import Privacy from "./pages/Privacy";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/category/:slug" component={CategoryPage} /><Route path="/product/:id" component={ProductDetails} /><Route path="/my-orders" component={MyOrders} /><Route path="/privacy" component={Privacy} /><Route path="/staff/invite/:token" component={StaffInvite} /><Route path="/admin/staff" component={StaffManagement} /><Route path="/admin" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><div className={`store-intro ${showIntro ? "is-visible" : "is-hidden"}`} aria-hidden={!showIntro}><div className="intro-noise" /><div className="intro-orbit orbit-one" /><div className="intro-orbit orbit-two" /><div className="intro-wordmark"><img className="intro-logo" src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware logo" /><span className="intro-kicker">EST. 2010 · OLABODUWA</span><strong>DEWMINI</strong><b>HARDWARE STORE</b><i /></div><span className="intro-progress" /></div><div className="app-route-transition"><Router /></div></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
