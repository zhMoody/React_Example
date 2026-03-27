import { useState, useMemo } from "react";
import { NavLink } from "react-router";
import { route, AppRouteObject } from "../../router/router";
import { useTheme } from "../../context/ThemeContext";
import { ThemeMode } from "../../types/Enum";
import "../Layout.css";

// 精简的 SVG 图标组件集 (科技感线性风格)
const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Canvas: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
  ),
  Theme: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  ),
  Screenshot: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  ),
  PDF: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v6"/><path d="M5 12v6"/></svg>
  ),
  Watermark: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
  ),
  Progress: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Chevron: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <svg 
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  Moon: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  ),
  Sun: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  )
};

// 路由 ID 到 图标组件的映射
const iconMap: Record<string, React.ElementType> = {
  "虚拟列表": Icons.Home,
  "Canvas 异性选区": Icons.Canvas,
  "Theme": Icons.Theme,
  "截图": Icons.Screenshot,
  "PDF 预览": Icons.PDF,
  "水印": Icons.Watermark,
  "请求进度条": Icons.Progress,
  "用户": Icons.User,
};

const Menu = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const menuItems: AppRouteObject[] = useMemo(() => route[0].children || [], []);

  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  const toggleTheme = () => {
    const isDark = theme === ThemeMode.DARK || (theme === ThemeMode.SYSTEM && resolvedTheme === "dark");
    setTheme(isDark ? ThemeMode.LIGHT : ThemeMode.DARK);
  };

  return (
    <nav className={`menu ${isCollapsed ? "collapsed" : ""}`} aria-label="主导航">
      <div className="menu-header">
        <div className="logo-container">
          <div className="logo">LAB<span className="logo-dot">.</span>IO</div>
        </div>
        <button 
          className="collapse-btn" 
          onClick={toggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "展开" : "收起"}
        >
          <Icons.Chevron isCollapsed={isCollapsed} />
        </button>
      </div>
      
      <div className="menu-list" role="menubar" aria-orientation="vertical">
        {menuItems.map((item, index) => {
          const toPath = item.index ? "/" : item.path || "/";
          const label = item.id || "Page";
          const IconComponent = iconMap[label] || Icons.PDF;
          
          return (
            <NavLink
              key={index}
              to={toPath}
              end={item.index}
              className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
              title={isCollapsed ? label : ""}
              role="menuitem"
            >
              <span className="menu-icon" aria-hidden="true">
                <IconComponent />
              </span>
              <span className="menu-text line-clamp">
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>

      <div className="menu-footer">
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          aria-label="切换主题"
        >
          <span className="menu-icon" aria-hidden="true">
            {resolvedTheme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
          </span>
          <span className="menu-text">
            {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default Menu;
