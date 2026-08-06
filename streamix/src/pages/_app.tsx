import Layout from "@/components/ui/Layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>

    <UserProvider>

        <Layout>

            <Component {...pageProps}/>

        </Layout>

    </UserProvider>

</ThemeProvider>
   
  );
}