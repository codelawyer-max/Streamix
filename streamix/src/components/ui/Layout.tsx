import { ReactNode, useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import { useTheme } from "@/lib/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import OTPVerification from "./OTPVerification";
import { useUser } from "@/lib/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { theme } = useTheme();

  const { otpRequired } = useUser();



  return (

    <div
      className={`flex min-h-screen flex-col font-sans transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gray-50 text-black"
      }`}
    >


      <Header
        onMenuClick={() =>
          setIsSidebarOpen((prev) => !prev)
        }
      />



      <div className="flex flex-1 relative">


        <Sidebar
          isOpen={isSidebarOpen}
        />



        <main className="pt-14 flex-1 overflow-y-auto px-4 py-4 md:px-6">


          <div className="mb-4 flex justify-end">

            <ThemeToggle />

          </div>



          {children}


        </main>


      </div>



      {
        otpRequired &&
        <OTPVerification />
      }



    </div>

  );

}