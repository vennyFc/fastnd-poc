import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { TenantAdminRoute } from "./components/TenantAdminRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { MainLayout } from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import DataHub from "./pages/DataHub";
import Projects from "./pages/Projects";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Applications from "./pages/Applications";
import Collections from "./pages/Collections";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import AccessLogs from "./pages/AccessLogs";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-hub"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DataHub />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Projects />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Products />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Customers />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Applications />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Collections />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            }
          />
            <Route
              path="/admin"
              element={
                <TenantAdminRoute>
                  <MainLayout>
                    <Admin />
                  </MainLayout>
                </TenantAdminRoute>
              }
            />
            <Route
              path="/super-admin"
              element={
                <SuperAdminRoute>
                  <MainLayout>
                    <SuperAdmin />
                  </MainLayout>
                </SuperAdminRoute>
              }
            />
            <Route
              path="/access-logs"
              element={
                <SuperAdminRoute>
                  <MainLayout>
                    <AccessLogs />
                  </MainLayout>
                </SuperAdminRoute>
              }
            />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
