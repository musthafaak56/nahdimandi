import { createContext, startTransition, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isPasswordUser } from "../lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
});

export function useAuthState() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    loading: true,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      startTransition(() => {
        setState({
          user,
          loading: false,
        });
      });
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        isAdmin: isPasswordUser(state.user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
