import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
const light = {
  bg: "#FBF8F7",
  surface: "#FFFFFF",
  text: "#30232C",
  muted: "#756771",
  line: "#E9E0E5",
  pink: "#AD346D",
  soft: "#F9E8EF",
  green: "#28664F",
};
const dark = {
  bg: "#19151A",
  surface: "#251F27",
  text: "#FAF0F5",
  muted: "#BEAFBA",
  line: "#403540",
  pink: "#F29DC4",
  soft: "#422A3A",
  green: "#95D8BB",
};
const Context = createContext({ colors: light, dark: false, toggle: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<boolean>();
  const isDark = override ?? system === "dark";
  return (
    <Context.Provider
      value={{
        colors: isDark ? dark : light,
        dark: isDark,
        toggle: () => setOverride(!isDark),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useTheme = () => useContext(Context);
