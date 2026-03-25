import { RouterProvider } from "react-router";
import { router } from "./router/router";
import { ThemeProvider } from "./context/ThemeContext";
import "./theme.css";
import "./App.css";

import { WatermarkProvider } from './context/WatermarkContext';

function App() {
  return (
    <ThemeProvider>
      <WatermarkProvider>
        <RouterProvider router={router} />
      </WatermarkProvider>
    </ThemeProvider>
  );
}


export default App;
