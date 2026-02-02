import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import Servicios from "./screens/Services/Servicios";
import Chats from "./screens/Chats/Chats";
import Ordenes from "./screens/Ordenes/Ordenes";
import Perfil from "./screens/Profile/Perfil";
import React from "react";
import { MainTabParamList } from "./types";


const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator 
      initialRouteName="Servicios"
      screenOptions={{
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="search" size={24} color={color} />,
        }} 
        name="Servicios" 
        component={Servicios} 
      />
      <Tab.Screen 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }} 
        name="Chats" 
        component={Chats} 
      />
      <Tab.Screen 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="list" size={24} color={color} />,
        }} 
        name="Ordenes" 
        component={Ordenes} 
      />
      <Tab.Screen 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="person" size={24} color={color} />,
        }} 
        name="Perfil" 
        component={Perfil} 
      />
    </Tab.Navigator>
  );
}

