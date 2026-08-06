import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/AuthContext";
import AxiosInstance from "@/lib/AxiosInstance";


export default function ThemeToggle() {

  const { theme, setTheme } = useTheme();

  const { user } = useUser();



  const handleThemeChange = async () => {
    console.log("Theme button clicked");

    const newTheme = theme === "light"
      ? "dark"
      : "light";


    // Change UI immediately
    setTheme(newTheme);



    if(user?._id){

      try {

        const response = await AxiosInstance.patch(
          `/user/theme/${user._id}`,
          {
            theme: newTheme
          }
        );


        console.log(
          "Theme updated:",
          response.data
        );


      } catch(error){

        console.log(
          "Theme update error:",
          error
        );

      }

    }

  };



  return (
    <button
      onClick={handleThemeChange}
      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {theme === "light"
        ? "🌙 Dark Mode"
        : "☀️ Light Mode"}
    </button>
  );
}