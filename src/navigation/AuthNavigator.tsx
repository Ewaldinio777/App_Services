import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Auth from "./screens/Auth";
import AuthSignUp from "./screens/AuthSignUp";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Auth"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Auth" component={Auth} />
      <Stack.Screen name="Registrarse" component={AuthSignUp} />
    </Stack.Navigator>
  );
}
