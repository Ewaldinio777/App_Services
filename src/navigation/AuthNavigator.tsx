import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Auth from "./screens/Auth";
import AuthSignUp from "./screens/AuthSignUp";
import AuthVerifyOTP from "./screens/AuthVerifyOTP";
import AuthPasswordRecovery from "./screens/AuthPasswordRecovery";

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