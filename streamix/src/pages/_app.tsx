import Layout from "@/components/ui/Layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {UserProvider} from "../lib/AuthContext"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  );
}
