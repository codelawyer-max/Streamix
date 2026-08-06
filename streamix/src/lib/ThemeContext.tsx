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



export const ThemeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {


  const [theme, setTheme] =
  useState<Theme>("light");



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