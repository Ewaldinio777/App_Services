import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import "@/global.css";

import { useRef } from "react";
import { AuthProvider } from "./src/context/AuthContext";

import Auth from "@/src/navigation/screens/Auth";
import ManagerCrud from "@/src/navigation/screens/ManagerCrud";
import AuthSignUp from "@/src/navigation/screens/AuthSignUp";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const RootStack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef<any>(null);

  return (
    <GluestackUIProvider mode="dark">
      <AuthProvider navigationRef={navigationRef}>
        <NavigationContainer ref={navigationRef}>
          <RootStack.Navigator initialRouteName="Auth">
            <RootStack.Screen name="Auth" component={Auth} />
            <RootStack.Screen name="Registrarse" component={AuthSignUp} />
            <RootStack.Screen name="ManagerCrud" component={ManagerCrud} />
          </RootStack.Navigator>
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
