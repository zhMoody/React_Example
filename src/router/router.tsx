import { createBrowserRouter, RouteObject } from "react-router";
import { Virtual } from "../pages/virtual/Virtual";
import { Layout } from "../baseLayout/Layout";
import { ReactNode } from "react";
import { ThemeChange } from "../pages/theme/ThemeChange";
import { Screenshot } from "../pages/screenshot/ScreenShot";
import { PDFRender } from "../pages/pdf_render/PDFRender";
import { WaterMark } from "../pages/water_mark/WaterMark";
import { User } from "../pages/user/user";
import { CanvasMonitor } from "../pages/Canvas/CanvasMonitor";
import { Progress } from "../pages/progress/Progress";

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
        path: "/canvas",
        element: <CanvasMonitor />,
        id: "Canvas 异性选区",
        icon: "🖼️",
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
      {
        path: "/progress",
        element: <Progress />,
        id: "请求进度条",
        icon: "📈",
      },
      {
        path: "/i18",
        element: <User />,
        id: "用户",
        icon: "😎",
      },
    ],
  },
];

const router = createBrowserRouter(route as RouteObject[]);

export { router, route };
