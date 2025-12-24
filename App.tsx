import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import "@/global.css";

import { useRef } from "react";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AuthNavigator from "./src/navigation/AuthNavigator";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServiciosElectricidad from "./src/navigation/screens/ServiciosElectricidad";
import ServiciosLimpieza from "./src/navigation/screens/ServiciosLimpieza";
import ServiciosPlomeria from "./src/navigation/screens/ServiciosPlomeria";

export default function App() {
  const navigationRef = useRef<any>(null);

  const Stack = createNativeStackNavigator();

  function AppNavigator() {
    const { session } = useAuth();
    console.log("AppNavigator session:", session);

    if (!session) return <AuthNavigator />;

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="ServiciosElectricidad" component={ServiciosElectricidad} options={{ headerShown: true, title: 'Servicios - Electricidad' }} />
        <Stack.Screen name="ServiciosLimpieza" component={ServiciosLimpieza} options={{ headerShown: true, title: 'Servicios - Limpieza' }} />
        <Stack.Screen name="ServiciosPlomeria" component={ServiciosPlomeria} options={{ headerShown: true, title: 'Servicios - Plomería' }} />
      </Stack.Navigator>
    );
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
