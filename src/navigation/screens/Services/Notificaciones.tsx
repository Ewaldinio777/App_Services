import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Notification } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/src/navigation/types";

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Hace unos segundos";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Ayer";
  return `Hace ${diffInDays} días`;
};

const Notificaciones: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to realtime changes
    if (session?.user) {
        const subscription = supabase
            .channel('notifications_list')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
                () => {
                    loadNotifications();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }
  }, [session]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Determine type for icons, logic is same as before but now we navigate
    // Assuming types: 'order', 'message', 'review' based on usage
    
    if (notification.type === 'order') {
        const isProviderNotification = notification.title.includes("Nueva Solicitud");
        
        navigation.navigate("MainTabs", { 
            screen: "Ordenes",
            params: { 
                initialView: isProviderNotification ? 'provider_orders' : undefined 
            }
        });
    } else if (notification.type === 'chat' || notification.type === 'message') {
         if (notification.related_id) {
             navigation.navigate("MainTabs", { screen: "Chats", params: { chatId: notification.related_id } });
         } else {
             navigation.navigate("MainTabs", { screen: "Chats" });
         }
    } else if (notification.type === 'review') {
        // Go to profile or services? Maybe Provider detail self.
        // For now, services or profile seems fine.
        navigation.navigate("MainTabs", { screen: "Perfil" });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
           <View style={styles.emptyContainer}>
               <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
               <Text style={styles.emptyText}>No tienes notificaciones</Text>
           </View>
        ) : (
            notifications.map((notification) => (
            <TouchableOpacity
                key={notification.id}
                style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
                onPress={() => handleNotificationPress(notification)}
            >
                <View style={styles.cardHeader}>
                {!notification.is_read && <Text style={styles.newBadge}>(NUEVA)</Text>}
                <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
                </View>
                <Text style={styles.body}>{notification.body}</Text>
                <Text style={styles.time}>{formatRelativeTime(notification.created_at)}</Text>
            </TouchableOpacity>
            ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1e", // Dark background based on image
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1c1c1e',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
      padding: 16,
      paddingBottom: 40,
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 100,
  },
  emptyText: {
      color: '#999',
      marginTop: 20,
      fontSize: 16,
  },
  notificationCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  unreadCard: {
    borderColor: '#fff', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  newBadge: {
    color: "#fff",
    fontWeight: "bold",
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: "#999",
    fontStyle: 'italic',
  },
});

export default Notificaciones;
