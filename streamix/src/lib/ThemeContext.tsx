import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";


type Theme = "light" | "dark";


interface ThemeContextType {

  theme: Theme;

  setTheme: (theme: Theme) => void;

  toggleTheme: () => void;

}



const ThemeContext =
createContext<ThemeContextType | null>(null);



// The same rule the server uses at login: light from 10:00 to 11:59 India
// time, dark the rest of the day. Used for visitors who are not logged in.
const getThemeForNow = (): Theme => {

  try {

    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hourCycle: "h23",
      }).format(new Date())
    );

    return hour >= 10 && hour < 12 ? "light" : "dark";

  } catch {

    return "dark";

  }

};



export const ThemeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {


  const [theme, setTheme] =
  useState<Theme>("light");



  // On first load: the saved user's theme, otherwise the time rule
  useEffect(() => {

    try {

      const stored = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      if (stored?.theme === "light" || stored?.theme === "dark") {

        setTheme(stored.theme);

        return;

      }

    } catch {

      // ignore unreadable storage

    }

    setTheme(getThemeForNow());

  }, []);



  useEffect(() => {


    document.documentElement.classList.remove(
      "light",
      "dark"
    );


    document.documentElement.classList.add(
      theme
    );


  }, [theme]);




  const toggleTheme = () => {


    setTheme((prev) =>
      prev === "light"
        ? "dark"
        : "light"
    );


  };




  return (

    <ThemeContext.Provider

      value={{
        theme,
        setTheme,
        toggleTheme,
      }}

    >

      {children}

    </ThemeContext.Provider>

  );


};




export const useTheme = () => {


  const context =
  useContext(ThemeContext);



  if(!context){

    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );

  }


  return context;


};
