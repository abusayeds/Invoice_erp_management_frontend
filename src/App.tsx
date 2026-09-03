/**
 * File: src/App.tsx
 * App root: wires global providers (React Query + Auth) around the router.
 */

import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import "./App.css";
import { route } from "./router/router";
import { queryClient } from "./lib/queryClient";
import AuthProvider from "./context/AuthProvider";
import { ErrorBoundary } from "./components/error/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={route} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
