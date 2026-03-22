import { Outlet } from "react-router";
import Menu from "./Menu/Menu";
import "./Layout.css";

const Layout = () => {
  return (
    <div className="layout">
      <Menu />
      <div className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
