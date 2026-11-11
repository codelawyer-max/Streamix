import Layout from "@/components/ui/Layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Toaster />

    <UserProvider>

        <Layout>

            <Component {...pageProps}/>

        </Layout>

    </UserProvider>

</ThemeProvider>
   
  );
}