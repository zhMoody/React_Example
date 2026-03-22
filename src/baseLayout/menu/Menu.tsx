import { NavLink } from "react-router";
import { route, AppRouteObject } from "../../router/router";
import "../Layout.css";

const Menu = () => {
  // 提取子路由列表
  const menuItems: AppRouteObject[] = route[0].children || [];

  return (
    <div className="menu">
      <div className="menu-header">🧪 React Demo Lab</div>
      
      <div className="menu-list">
        {menuItems.map((item: AppRouteObject, index: number) => {
          const toPath = item.index ? "/" : item.path || "/";
          
          return (
            <NavLink
              key={index}
              to={toPath}
              end={item.index}
              className={({ isActive }) => 
                `menu-item ${isActive ? "active" : ""}`
              }
            >
              <span className="menu-icon">
                {typeof item.icon === "string" ? item.icon : item.icon || "📄"}
              </span>
              <span className="menu-text">
                {item.id || "未命名页面"}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default Menu;
