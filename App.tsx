import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import "@/global.css";

import { useRef } from "react";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AuthNavigator from "./src/navigation/AuthNavigator";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import { NavigationContainer } from "@react-navigation/native";

export default function App() {
  const navigationRef = useRef<any>(null);

  function AppNavigator() {
    const { session } = useAuth();
    return session ? <MainTabNavigator /> : <AuthNavigator />;
  }

  return (
    <GluestackUIProvider mode="dark">
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
