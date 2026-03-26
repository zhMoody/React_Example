import { RouterProvider } from "react-router";
import { router } from "./router/router";
import { ThemeProvider } from "./context/ThemeContext";
import "./theme.css";
import "./App.css";

import { WatermarkProvider } from "./context/WatermarkContext";
import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <ThemeProvider>
      <WatermarkProvider>
        <UserProvider>
          <RouterProvider router={router} />
        </UserProvider>
      </WatermarkProvider>
    </ThemeProvider>
  );
}

export default App;
