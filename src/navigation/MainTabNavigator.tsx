import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import Servicios from "./screens/Servicios";
import Chats from "./screens/Chats";
import Ordenes from "./screens/Ordenes";
import Perfil from "./screens/Perfil";
import React from "react";
import Publicar from "./screens/Publicar";


const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator  initialRouteName="Servicios">
      <Tab.Screen options={ { tabBarIcon: ({color, size}) => { return <Ionicons name="search" size={24}/>; }, }} name="Servicios" component={Servicios} />
      <Tab.Screen options={ { tabBarIcon: ({color, size}) => { return <Ionicons name="chatbubbles" size={24}/>; }, }} name="Chats" component={Chats} />
      <Tab.Screen options={ { tabBarIcon: ({color, size}) => { return <Ionicons name="construct" size={24}/>; }, }} name="Publicar" component={Publicar} />
      <Tab.Screen options={ { tabBarIcon: ({color, size}) => { return <Ionicons name="list" size={24}/>; }, }} name="Ordenes" component={Ordenes} />
      <Tab.Screen options={ { tabBarIcon: ({color, size}) => { return <Ionicons name="person" size={24}/>; }, }} name="Perfil" component={Perfil} />
    </Tab.Navigator>
  );
}

