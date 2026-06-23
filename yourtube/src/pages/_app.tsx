import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import Script from "next/script";

function AppContent({ Component, pageProps }: { Component: any; pageProps: any }) {
  const { theme } = useUser();
  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "dark bg-neutral-900 text-white" : "bg-white text-black"}`}>
      <title>Your-Tube Clone</title>
      <Header />
      <Toaster />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-h-[calc(100vh-56px)] bg-background text-foreground">
          <Component {...pageProps} />
        </div>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <AppContent Component={Component} pageProps={pageProps} />
    </UserProvider>
  );
}
