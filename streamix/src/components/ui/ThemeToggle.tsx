import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/AuthContext";
import AxiosInstance from "@/lib/AxiosInstance";


export default function ThemeToggle() {

  const { theme, setTheme } = useTheme();

  const { user, setUser } = useUser();


  const isAutomatic = user?.themeSource !== "manual";


  // Keep the saved profile in the page in step with the server
  const saveUser = (updatedUser: any) => {

    if (!updatedUser) return;

    setUser(updatedUser);

    try {

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

    } catch {

      // storage unavailable: the page copy is enough

    }

  };


  // The user picks a theme: it is saved and kept at the next logins
  const handleThemeChange = async () => {

    const newTheme = theme === "light"
      ? "dark"
      : "light";


    // Change UI immediately
    setTheme(newTheme);


    if (user?._id) {

      try {

        const response = await AxiosInstance.patch(
          `/user/theme/${user._id}`,
          {
            theme: newTheme
          }
        );

        saveUser(response.data.result);

      } catch (error) {

        console.log(
          "Theme update error:",
          error
        );

      }

    }

  };


  // Go back to the automatic (login time) theme
  const handleAutomatic = async () => {

    if (!user?._id) return;

    try {

      const response = await AxiosInstance.patch(
        `/user/theme/${user._id}`,
        {
          auto: true
        }
      );

      if (response.data.result?.theme) {

        setTheme(response.data.result.theme);

      }

      saveUser(response.data.result);

    } catch (error) {

      console.log(
        "Theme update error:",
        error
      );

    }

  };



  return (
    <div className="flex flex-col items-start gap-1">

      <button
        onClick={handleThemeChange}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {theme === "light"
          ? <Moon size={16} />
          : <Sun size={16} />}

        {theme === "light"
          ? "Dark Mode"
          : "Light Mode"}
      </button>


      {user?._id && (

        isAutomatic ? (

          <span className="text-[11px] text-gray-500">
            Automatic theme (light 10 AM to 12 PM IST)
          </span>

        ) : (

          <button
            onClick={handleAutomatic}
            className="text-[11px] text-blue-600 hover:underline"
          >
            Switch back to automatic theme
          </button>

        )

      )}

    </div>
  );
}
