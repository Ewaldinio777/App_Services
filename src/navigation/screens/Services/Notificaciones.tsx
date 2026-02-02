import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
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

  if (diffInSeconds < 60) return "hace un momento";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "ayer";
  return `hace ${diffInDays} días`;
};

const NotificationItem = ({ item, onPress, onMorePress }: { item: Notification; onPress: (n: Notification) => void; onMorePress: (n: Notification) => void }) => {
    // Placeholder logic for avatar/thumbnail until DB is updated
    // In a real scenario, we would use item.metadata?.avatar_url or similar
    const showThumbnail = false; 

    return (
        <TouchableOpacity
            style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {/* Left: Avatar/Icon */}
            <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                     <Ionicons name="notifications" size={20} color="#fff" />
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </View>

            {/* Middle: Content */}
            <View style={styles.contentContainer}>
                <Text style={styles.notificationBody} numberOfLines={3}>
                     {item.body}
                </Text>
                 <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
            </View>

            {/* Right: Thumbnail & Menu */}
            <View style={styles.rightContainer}>
                {showThumbnail ? (
                    <View style={styles.thumbnailPlaceholder} />
                ) : (
                     <View style={{ width: 60 }} /> // Spacer to mimic layout if no thumbnail
                )} 
                 
                <TouchableOpacity onPress={() => onMorePress(item)} style={styles.moreButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
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

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
      Alert.alert("Error", "No se pudo eliminar la notificación");
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
        markAsRead(notification.id);
    }
    
    // Navigation Logic
    if (notification.type === 'order' || notification.title.toLowerCase().includes('solicitud') || notification.title.toLowerCase().includes('orden')) {
        const isProviderNotification = notification.title.includes("Nueva Solicitud");
        // Navigate to Orders screen
        // If it's a specific order, ideally we'd go to OrderDetail, but Ordenes tab is a good start
        // We pass params to help Ordenes screen select the tab or filter
        navigation.navigate("MainTabs", { 
            screen: "Ordenes",
            params: { 
                initialView: isProviderNotification ? 'provider_orders' : undefined 
            }
        });
    } else if (notification.type === 'chat' || notification.type === 'message' || notification.title.toLowerCase().includes('mensaje')) {
         if (notification.related_id) {
             navigation.navigate("MainTabs", { 
                 screen: "Chats", 
                 params: { chatId: notification.related_id } 
             });
         } else {
             navigation.navigate("MainTabs", { screen: "Chats" });
         }
    } else if (notification.type === 'review' || notification.title.toLowerCase().includes('calific') || notification.title.toLowerCase().includes('reseña')) {
         // Assuming navigation to Profile where reviews might be visible, or Service detail
         navigation.navigate("MainTabs", { screen: "Perfil" });
    } else if (notification.type === 'complaint' || notification.title.toLowerCase().includes('queja')) {
        // Go to support or specific order
        if (notification.related_id) {
             // If we had a generic way to go to an order detail:
             // navigation.navigate("OrderDetail", { orderId: notification.related_id });
             // Fallback to Ordenes
             navigation.navigate("MainTabs", { screen: "Ordenes" });
        }
    }
  };

  const handleMorePress = (notification: Notification) => {
      Alert.alert(
        "Opciones",
        "¿Qué deseas hacer con esta notificación?",
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Eliminar notificación",
            style: "destructive",
            onPress: () => deleteNotification(notification.id)
          }
        ]
      );
  };

  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const groups = {
        hoy: [] as Notification[],
        semana: [] as Notification[],
        anteriores: [] as Notification[]
    };

    notifications.forEach(n => {
        const nDate = new Date(n.created_at);
        // Normalize time for comparison
        const nDateOnly = new Date(nDate);
        nDateOnly.setHours(0,0,0,0);

        if (nDateOnly.getTime() === today.getTime()) {
            groups.hoy.push(n);
        } else if (nDateOnly >= oneWeekAgo) {
            groups.semana.push(n);
        } else {
            groups.anteriores.push(n);
        }
    });
    return groups;
  }, [notifications]);


  if (loading) {
     return (
       <View style={styles.centerContainer}>
         <ActivityIndicator size="large" color="#F97316" />
       </View>
     );
  }

  return (
    <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} colors={["#F97316"]} />
        }
    >
      {notifications.length === 0 ? (
          <View style={styles.centerContainer}>
              <Text style={{ color: "#666", marginTop: 50 }}>No tienes notificaciones</Text>
          </View>
      ) : (
          <>
            {groupedNotifications.hoy.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hoy</Text>
                    {groupedNotifications.hoy.map(n => <NotificationItem key={n.id} item={n} onPress={handleNotificationPress} onMorePress={handleMorePress} />)}
                </View>
            )}
            
            {groupedNotifications.semana.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Esta semana</Text>
                    {groupedNotifications.semana.map(n => <NotificationItem key={n.id} item={n} onPress={handleNotificationPress} onMorePress={handleMorePress} />)}
                </View>
            )}

            {groupedNotifications.anteriores.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Anteriores</Text>
                    {groupedNotifications.anteriores.map(n => <NotificationItem key={n.id} item={n} onPress={handleNotificationPress} onMorePress={handleMorePress} />)}
                </View>
            )}
          </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 16,
    marginBottom: 5,
    marginTop: 10,
  },
  notificationItem: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0, 
    // YouTube style doesn't have separators usually between every item in the same style, but let's keep it clean
  },
  unreadItem: {
    backgroundColor: "#EFF6FF", // Light blue tint for unread
  },
  avatarContainer: {
    marginRight: 12,
    position: "relative",
    justifyContent: 'flex-start',
    paddingTop: 4, 
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  notificationBody: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#606060",
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 34, 
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginRight: 8,
  },
  moreButton: {
    padding: 5,
    marginTop: -5,
  }
});

export default Notificaciones;
