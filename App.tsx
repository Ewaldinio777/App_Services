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
import ProviderDetail from "./src/navigation/screens/Services/ProviderDetail";
import BecomeProvider from "./src/navigation/screens/Services/BecomeProvider";
import Notificaciones from "./src/navigation/screens/Services/Notificaciones";
import ChatDetail from "./src/navigation/screens/Chats/ChatDetail";
import { RootStackParamList } from "./src/navigation/types";

export default function App() {
  const navigationRef = useRef<any>(null);

  const Stack = createNativeStackNavigator<RootStackParamList>();

  function AppNavigator() {
    const { session } = useAuth();
    console.log("AppNavigator session:", session);

    if (!session) return <AuthNavigator />;

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="ProviderDetail" component={ProviderDetail} options={{ headerShown: true, title: 'Detalle del Proveedor' }} />
        <Stack.Screen name="BecomeProvider" component={BecomeProvider} options={{ headerShown: true, title: 'Convertirse en Proveedor' }} />
        <Stack.Screen name="Notificaciones" component={Notificaciones} options={{ headerShown: true, title: 'Notificaciones' }} />
        <Stack.Screen name="ChatDetail" component={ChatDetail} options={{ headerShown: true, title: 'Chat' }} />
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
