import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ManagerCrud from "./screens/ManagerCrud";
// import Home from "./screens/Home";
import { Text } from "react-native";

const Tab = createBottomTabNavigator();

function Placeholder({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      {/* <Tab.Screen name="Home" component={Home} /> */}
      <Tab.Screen name="Manager" component={ManagerCrud} />
      <Tab.Screen name="Other" children={() => <Placeholder label="Other" />} />
    </Tab.Navigator>
  );
}
