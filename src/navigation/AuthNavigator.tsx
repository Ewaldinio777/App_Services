import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Auth from "./screens/Auth/Auth";
import AuthSignUp from "./screens/Auth/AuthSignUp";
import AuthVerifyOTP from "./screens/Auth/AuthVerifyOTP";
import AuthPasswordRecovery from "./screens/Auth/AuthPasswordRecovery";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Auth"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Auth" component={Auth} />
      <Stack.Screen name="Register" component={AuthSignUp} />
      <Stack.Screen name="ResetPassword" component={AuthPasswordRecovery} />

      <Stack.Screen name="VerifyOTP" component={AuthVerifyOTP} />
    </Stack.Navigator>
  );
}