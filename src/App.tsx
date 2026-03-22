import { RouterProvider } from "react-router";
import { router } from "./router/router";
import { ThemeProvider } from "./context/ThemeContext";
import "./theme.css";
import "./App.css";

const App = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
