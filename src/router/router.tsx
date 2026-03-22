import { createBrowserRouter, RouteObject } from "react-router";
import Virtual from "../pages/virtual/Virtual";
import Layout from "../baseLayout/Layout";
import { ReactNode } from "react";
import ThemeChange from "../pages/theme/ThemeChange";
import { Screenshot } from "../pages/screenshot/ScreenShot";
import { PDFRender } from "../pages/pdf_render/PDFRender";
import { WaterMark } from "../pages/water_mark/WaterMark";

/**
 * 扩展官方 RouteObject 类型，增加自定义的属性
 */
export type AppRouteObject = RouteObject & {
  id?: string;
  icon?: string | ReactNode;
  children?: AppRouteObject[];
};

const route: AppRouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Virtual />,
        id: "虚拟列表",
        icon: "🏠",
      },
      {
        path: "/theme",
        element: <ThemeChange />,
        id: "Theme",
        icon: "🎨",
      },
      {
        path: "/screenshot",
        element: <Screenshot />,
        id: "截图",
        icon: "🎦",
      },
      {
        path: "/pdf",
        element: <PDFRender />,
        id: "PDF 预览",
        icon: "📜",
      },
      {
        path: "/water-mark",
        element: <WaterMark />,
        id: "水印",
        icon: "💧",
      },
    ],
  },
];

const router = createBrowserRouter(route as RouteObject[]);

export { router, route };
