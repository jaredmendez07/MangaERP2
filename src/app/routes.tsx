import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { UserDashboard } from "./pages/UserDashboard";
import { InventoryPage } from "./pages/InventoryPage";
import { ProductionPage } from "./pages/ProductionPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { MangaProductsPage } from "./pages/MangaProductsPage";
import { ProductRecipesPage } from "./pages/ProductRecipesPage";
import { WastePage } from "./pages/WastePage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "admin", Component: AdminDashboard },
      { path: "user", Component: UserDashboard },
      { path: "inventory", Component: InventoryPage },
      { path: "production", Component: ProductionPage },
      { path: "mangas", Component: MangaProductsPage },
      { path: "recipes", Component: ProductRecipesPage },
      { path: "ai-assistant", Component: AIAssistantPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "waste", Component: WastePage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);
