import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  ClerkLoaded,
  ClerkLoading,
  RedirectToSignIn,
  useUser,
} from "@clerk/clerk-react";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import VisitorForm from "./features/visitor/VisitorForm";
import ReceiptsPage from "./pages/ReceiptsPage";
import AdminDashboard from "./features/admin/AdminDashboard";
import GuardDashboard from "./features/guard/GuardDashboard";
import Loader from "./components/Loader";
import ScrollToTop from "./components/ScrollToTop"; 
import { ShieldAlert } from "lucide-react";

// NEW: Import the Context Provider and Hook
import { PermissionProvider, usePermissions } from "./context/PermissionContext";

// Standard protection: User just needs to be logged in (Members, Sub-Admins, Admins)
const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <Loader fullScreen={true} />;
  if (!isSignedIn) {
    return <><Loader fullScreen={true} /><RedirectToSignIn /></>;
  }
  return children;
};

// Strict Role-based Route Protector (Now driven by MongoDB)
const RoleRoute = ({ children, allowedRoles }) => {
  const { isLoaded, isSignedIn } = useUser();
  // NEW: Fetch permissions and DB loading state from context
  const { permissions, loadingDb } = usePermissions();

  // Wait for both Clerk and MongoDB to finish loading
  if (!isLoaded || loadingDb) return <Loader fullScreen={true} />;

  if (!isSignedIn) {
    return <><Loader fullScreen={true} /><RedirectToSignIn /></>;
  }

  // Get the role from MongoDB, default to "member"
  const userRole = permissions?.role || "member";
  
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="text-red-500 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-white/50 max-w-md">
          Your current database role ({userRole}) does not have permission to view this dashboard.
        </p>
      </div>
    );
  }

  return children;
};

// Smart Redirector: Sends users to their specific dashboard upon login (Now driven by MongoDB)
const DashboardRedirect = () => {
  const { isLoaded } = useUser();
  // NEW: Fetch permissions and DB loading state from context
  const { permissions, loadingDb } = usePermissions();
  
  // Wait for both Clerk and MongoDB to finish loading
  if (!isLoaded || loadingDb) return <Loader fullScreen={true} />;
  
  // Get the role from MongoDB, default to "member"
  const userRole = permissions?.role || "member";

  if (userRole === "admin") return <Navigate to="/admin" replace />;
  if (userRole === "sub_admin") return <Navigate to="/guard" replace />;
  
  // Default member redirect
  return <Navigate to="/apply" replace />;
};

function App() {
  return (
    <>
      <ClerkLoading>
        <Loader fullScreen={true} />
      </ClerkLoading>

      <ClerkLoaded>
        {/* NEW: Wrap the application inside the PermissionProvider */}
        <PermissionProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<LandingPage />} />
                
                {/* Traffic Controller - Routes users based on their role */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

                {/* Member Routes (Accessible by Admin, Sub-Admin, and Member) */}
                <Route path="/apply" element={<ProtectedRoute><VisitorForm /></ProtectedRoute>} />
                <Route path="/receipts" element={<ProtectedRoute><ReceiptsPage /></ProtectedRoute>} />

                {/* Sub-Admin Route (Accessible by Admin and Sub-Admin ONLY) */}
                <Route 
                  path="/guard" 
                  element={
                    <RoleRoute allowedRoles={["admin", "sub_admin"]}>
                      <GuardDashboard />
                    </RoleRoute>
                  } 
                />

                {/* Master Admin Route (Accessible by Admin ONLY) */}
                <Route 
                  path="/admin" 
                  element={
                    <RoleRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </RoleRoute>
                  } 
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </PermissionProvider>
      </ClerkLoaded>
    </>
  );
}

export default App;