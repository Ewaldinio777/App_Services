import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import "@/global.css";

import { useRef, useEffect } from "react";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AuthNavigator from "./src/navigation/AuthNavigator";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProviderDetail from "./src/navigation/screens/Services/ProviderDetail";
import BecomeProvider from "./src/navigation/screens/Services/BecomeProvider";
import Notificaciones from "./src/navigation/screens/Services/Notificaciones";
import ChatDetail from "./src/navigation/screens/Chats/ChatDetail";
import ScheduleServiceScreen from "./src/navigation/screens/Chats/ScheduleServiceScreen";
import { RootStackParamList } from "./src/navigation/types";
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, updatePushToken } from "./src/lib/push-notifications"; // Import helpers

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification Response:', data);
      
      // Navigate to the appropriate screen
      // If we have specific data, use it. Otherwise try to infer from type/related_id like Notificaciones.tsx
      if (data?.screen) {
         setTimeout(() => {
            navigationRef.current?.navigate(data.screen, data.params);
         }, 500);
      } else if (data?.type) {
         // Logic mirroring Notificaciones.tsx
         setTimeout(() => {
             const type = data.type; // 'order', 'chat', 'review', 'complaint'
             const related_id = data.related_id;
             
             if (type === 'order' || type === 'request') {
                  navigationRef.current?.navigate("MainTabs", { screen: "Ordenes" });
             } else if (type === 'chat' || type === 'message') {
                  if (related_id) {
                      navigationRef.current?.navigate("ChatDetail", { chatId: related_id });
                  } else {
                      navigationRef.current?.navigate("MainTabs", { screen: "Chats" });
                  }
             } else if (type === 'review') {
                  navigationRef.current?.navigate("MainTabs", { screen: "Perfil" });
             } else {
                  // Default
                  navigationRef.current?.navigate("Notificaciones");
             }
         }, 500);
      } else {
         // Default to Notificaciones screen
         setTimeout(() => {
            navigationRef.current?.navigate('Notificaciones');
         }, 500);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const Stack = createNativeStackNavigator<RootStackParamList>();

  function AppNavigator() {
    const { session } = useAuth();
    console.log("AppNavigator session:", session);

    // Register for push notifications when session is available
    useEffect(() => {
      if (session?.user?.id) {
        registerForPushNotificationsAsync().then((token) => {
          if (token) {
            updatePushToken(session.user.id, token);
          }
        });
      }
    }, [session]);

    if (!session) return <AuthNavigator />;

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="ProviderDetail" component={ProviderDetail} options={{ headerShown: true, title: 'Detalle del Proveedor' }} />
        <Stack.Screen name="BecomeProvider" component={BecomeProvider} options={{ headerShown: true, title: 'Convertirse en Proveedor' }} />
        <Stack.Screen name="Notificaciones" component={Notificaciones} options={{ headerShown: true, title: 'Notificaciones' }} />
        <Stack.Screen name="ChatDetail" component={ChatDetail} options={{ headerShown: true, title: 'Chat' }} />
        <Stack.Screen name="ScheduleService" component={ScheduleServiceScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <GluestackUIProvider mode="light">
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
