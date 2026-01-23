import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Center } from "@/src/components/ui/center";
import { Text } from "@/src/components/ui/text";
import { Fab, FabIcon, FabLabel } from "@/src/components/ui/fab";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../types";
import { supabase } from "@/src/lib/supabase-client";
import { Profile, Provider } from "@/src/types/database.types";

const Servicios: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProvider, setIsProvider] = useState(false);
  const [providers, setProviders] = useState<(Provider & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadUserProfile();
      loadUnreadNotifications();
      loadProviders();
      
      // Subscribe to notifications changes
      const subscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          () => {
            loadUnreadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [session]);

  const loadUserProfile = async () => {
    try {
      if (!session?.user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_provider')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setIsProvider(data?.is_provider || false);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      if (!session?.user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading notifications count:', error);
    }
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Session not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate("Notificaciones")}
        >
          <Ionicons name="notifications" size={28} color="#007AFF" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {!isProvider && (
          <TouchableOpacity
            style={styles.becomeProviderButton}
            onPress={() => navigation.navigate("BecomeProvider")}
          >
            <Ionicons name="briefcase" size={20} color="#fff" />
            <Text style={styles.becomeProviderText}>Ser Proveedor</Text>
          </TouchableOpacity>
        )}
      </View>

      <Center style={styles.centerStyle}>
        <Fab
          onPress={() => navigation.navigate("ServiciosPlomeria", { category: "Plomería" })}
          size="sm"
          placement="top center"
          isHovered={false}
          isDisabled={false}
          isPressed={false}
        >
          <FabIcon as={Ionicons} name="water-sharp" size={20} />
          <FabLabel>Plomería</FabLabel>
        </Fab>
      </Center>

      <Center style={styles.centerStyle}>
        <Fab
          onPress={() => navigation.navigate("ServiciosElectricidad", { category: "Electricidad" })}
          placement="top center"
          isHovered={false}
          isDisabled={false}
          isPressed={false}
        >
          <FabIcon as={Ionicons} name="flash-sharp" size={20} />
          <FabLabel>Electricista</FabLabel>
        </Fab>
      </Center>

      <Center style={styles.centerStyle}>
        <Fab
          onPress={() => navigation.navigate("ServiciosLimpieza", { category: "Limpieza" })}
          size="sm"
          placement="top center"
          isHovered={false}
          isDisabled={false}
          isPressed={false}
        >
          <FabIcon as={Ionicons} name="sparkles-sharp" size={20} />
          <FabLabel>Limpieza</FabLabel>
        </Fab>
      </Center>

      {/* Provider List Section */}
      <View style={styles.providersSection}>
        <Text style={styles.sectionTitle}>Proveedores Destacados</Text>
        {loading ? (
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        ) : providers.length === 0 ? (
          <Text style={styles.emptyText}>No hay proveedores disponibles</Text>
        ) : (
          providers.slice(0, 5).map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
            >
              <View style={styles.providerInfo}>
                <Ionicons name="person-circle" size={40} color="#007AFF" />
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>
                    {provider.profile?.full_name || "Proveedor"}
                  </Text>
                  <Text style={styles.providerSpecialization}>
                    {provider.specialization}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {provider.rating?.toFixed(1) || "Sin calificaciones"}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  becomeProviderButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  becomeProviderText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 14,
  },
  centerStyle: {
    gap: 10,
    marginBottom: 20,
    marginTop: 20,
  },
  providersSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerDetails: {
    marginLeft: 15,
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  providerSpecialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#999',
  },
});

export default Servicios;
