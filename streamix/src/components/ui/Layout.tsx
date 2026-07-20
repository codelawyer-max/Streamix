import { ReactNode, useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans text-black">

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
          {children}
        </main>

      </div>

    </div>
  );
}