import { Outlet } from "react-router";
import "./Layout.css";
import Menu from "./menu/Menu";

export const Layout = () => {
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
