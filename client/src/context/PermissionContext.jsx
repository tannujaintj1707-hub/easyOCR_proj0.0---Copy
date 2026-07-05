import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [permissions, setPermissions] = useState(null);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    let isMounted = true; // Prevents race conditions during multiple renders

    const syncAndFetchPermissions = async () => {
      setLoadingDb(true); 
      try {
        // 1. Send the Clerk ID, Email, AND CLERK ROLE to MongoDB
        await fetch(`http://localhost:5000/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            clerk_id: user.id, 
            email: user.primaryEmailAddress?.emailAddress,
            role: user.publicMetadata?.role 
          })
        });

        // 2. Fetch their specific MongoDB permissions
        const timestamp = new Date().getTime();
        const response = await fetch(`http://localhost:5000/api/auth/permissions?clerk_id=${user.id}&t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Only update state if the component is still mounted
          if (isMounted) setPermissions(data);
        } else {
          console.error("Failed to fetch permissions, status:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch DB permissions", error);
      } finally {
        if (isMounted) setLoadingDb(false);
      }
    };

    if (isLoaded) {
      if (isSignedIn && user) {
        syncAndFetchPermissions();
      } else if (!isSignedIn) {
        if (isMounted) {
          setPermissions(null);
          setLoadingDb(false);
        }
      }
    }
    
    // Cleanup function blocks outdated network responses
    return () => {
      isMounted = false; 
    };
  }, [isLoaded, isSignedIn, user?.id, user?.publicMetadata?.role]); 

  return (
    <PermissionContext.Provider value={{ permissions, loadingDb }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);