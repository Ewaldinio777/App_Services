import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../../types";
import { supabase } from "@/src/lib/supabase-client";
import { Profile, Provider } from "@/src/types/database.types";

const VENEZUELA_STATES = [
  "Todos",
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", 
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", 
  "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", 
  "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", 
  "Yaracuy", "Zulia"
];

const Servicios: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProvider, setIsProvider] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [providers, setProviders] = useState<(Provider & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Todos" | "Plomería" | "Electricidad" | "Limpieza">("Todos");
  const [selectedState, setSelectedState] = useState("Todos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isStateModalVisible, setIsStateModalVisible] = useState(false);

const categories = [
  "Todos",
  "Plomería",
  "Electricidad",
  "Limpieza",
];

  useFocusEffect(
    useCallback(() => {
        loadProviders();
        loadUnreadNotifications();
    }, [])
  );

  useEffect(() => {
    if (session?.user) {
      loadUserProfile();
      loadUnreadNotifications();
      // loadProviders(); // Now called in useFocusEffect
      
      // Subscribe to notifications changes
      const subscription = supabase
        .channel('notifications_badge_count')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            console.log("Notification change detected!", payload);
            loadUnreadNotifications();
          }
        )
        .subscribe();
        
      // Subscribe to profile changes (real-time avatar updates)
      const profilesSubscription = supabase
        .channel('public:profiles_services')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
             const updatedProfile = payload.new as Profile;
             setProviders(prevProviders => prevProviders.map(p => {
                // If the updated profile belongs to one of the providers in the list
                if (p.profile?.id === updatedProfile.id) {
                    // Update the profile data nested in the provider object
                    return { ...p, profile: { ...p.profile, ...updatedProfile } };
                }
                return p;
             }));
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        profilesSubscription.unsubscribe();
      };
    }
  }, [session]);

  const loadUserProfile = async () => {
    try {
      if (!session?.user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_provider, full_name')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setIsProvider(data?.is_provider || false);
      setUserName(data?.full_name || "");
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return providers.filter((provider) => {
      const isCurrentUserProvider =
        provider.profile?.id === session?.user?.id || provider.id === session?.user?.id;

      if (isCurrentUserProvider) return false;

      const matchesCategory =
        selectedCategory === "Todos"
          ? true
          : Array.isArray(provider.specialization)
            ? provider.specialization.includes(selectedCategory)
            : typeof provider.specialization === 'string'
              ? (provider.specialization as string).includes(selectedCategory)
              : false;

      const matchesState = 
        selectedState === "Todos"
          ? true
          : provider.profile?.state === selectedState;

      const fullName = provider.profile?.full_name || "";
      const matchesQuery = query.length === 0 ? true : fullName.toLowerCase().includes(query);

      return matchesCategory && matchesState && matchesQuery;
    });
  }, [providers, searchQuery, selectedCategory, selectedState, session?.user?.id]);

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
      // setLoading(true); // Removing setLoading(true) to avoid full flicker on every focus
      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      if (loading) setLoading(false); // Only unset loading if it was initially true (first load)
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled" 
        keyboardDismissMode="on-drag"
      >
      <View style={styles.headerContainer}>
        <View style={styles.headerSubRow}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Hola{userName ? "," : ""}</Text>
            <Text style={styles.userNameText}>{userName || "Bienvenido"}</Text>
          </View>

          <View style={styles.headerRight}>
            {!isProvider ? (
              <TouchableOpacity
                style={styles.becomeProviderButton}
                onPress={() => navigation.navigate("BecomeProvider")}
              >
                <Ionicons name="briefcase-outline" size={16} color="#fff" />
                <Text style={styles.becomeProviderText}>Ser Proveedor</Text>
              </TouchableOpacity>
            ) : (
               <Text style={styles.providerLabel}>Proveedor de Servicio</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchAndNotificationWrapper}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar servicio..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Notificaciones")}
          >
            <Ionicons name="notifications-outline" size={26} color="#F97316" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterButton, styles.activeFilterButton]}
            onPress={() => setIsFilterOpen((prev) => !prev)}
          >
            <Ionicons name="grid-outline" size={16} color="#fff" />
            <Text style={[styles.filterText, styles.activeFilterText]}>
              {selectedCategory === "Todos" ? "Categoría" : selectedCategory}
            </Text>
            <Ionicons name={isFilterOpen ? "chevron-up" : "chevron-down"} size={12} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsStateModalVisible(true)}
          >
            <Ionicons name="map-outline" size={16} color="#4B5563" />
            <Text style={styles.filterText}>
              {selectedState === "Todos" ? "Estado" : selectedState}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

       {/* Services Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterOpen}
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(item as "Todos" | "Plomería" | "Electricidad" | "Limpieza");
                    setIsFilterOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCategory === item && { color: "#F97316", fontWeight: "bold" }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400, width: "100%" }}
            />
             <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsFilterOpen(false)}
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* State Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStateModalVisible}
        onRequestClose={() => setIsStateModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar Estado</Text>
            <FlatList
              data={VENEZUELA_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedState(item);
                    setIsStateModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedState === item && { color: "#F97316", fontWeight: "bold" }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400, width: "100%" }}
            />
             <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsStateModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Provider List Section */}
      <View style={styles.providersSection}>
        <Text style={styles.sectionTitle}>Proveedores</Text>
        {loading ? (
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        ) : filteredProviders.length === 0 ? (
          <Text style={styles.emptyText}>No hay proveedores con estos criterios</Text>
        ) : (
          filteredProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
            >
              <View style={styles.providerInfo}>
                {(() => {
                    const avatarUrl = Array.isArray(provider.profile) 
                        ? provider.profile[0]?.avatar_url 
                        : provider.profile?.avatar_url;
                    
                    if (avatarUrl) {
                        return (
                            <Image 
                              source={{ uri: avatarUrl }} 
                              style={styles.avatar} 
                            />
                        );
                    }
                    return <Ionicons name="person-circle" size={46} color="#F97316" />;
                })()}
                
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>
                    {Array.isArray(provider.profile) 
                        ? provider.profile[0]?.full_name || "Proveedor" 
                        : provider.profile?.full_name || "Proveedor"}
                  </Text>
                  <Text style={styles.providerSpecialization}>
                    {Array.isArray(provider.specialization)
                      ? provider.specialization.join(", ")
                      : provider.specialization}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {provider.rating?.toFixed(1) || "Sin calificaciones"}
                      {provider.total_reviews ? ` (${provider.total_reviews})` : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.providerActions}>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
                >
                  <Text style={styles.messageButtonText}>Ver Perfil</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 40, // More space for top status bar area
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  userNameText: {
    fontSize: 24, // Larger
    fontWeight: '900', // Bolder
    color: '#000',
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  notificationButton: {
    position: 'relative',
    marginLeft: 10,
    backgroundColor: '#E0F2FE', // Light blue/orange tint background for bell? Image has transparent/blue icon. Let's keep icon color #F97316 but maybe no bg or circle bg.
    // Image shows distinct blue bell. We use #F97316.
    padding: 8,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  becomeProviderButton: {
    flexDirection: 'row',
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    alignItems: 'center',
  },
  becomeProviderText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 10,
    gap: 15,
  },
  searchAndNotificationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', // White background
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F97316', // Orange border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF', // Light background
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // Pill shape
    gap: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F97316', // Filled Orange
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937', 
  },
  activeFilterText: {
    color: '#fff',
  },
  providersSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6B7280', // Grayish 
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
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    // Higher elevation/shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
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
    marginBottom: 4,
    color: '#000',
  },
  providerSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  providerActions: {
    justifyContent: 'center',
  },
  messageButton: {
    backgroundColor: '#F97316', // Orange Button
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // Pill button
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  providerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000', // Black text
  },
  // Modal styles...
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
  },
  modalItemText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 15,
    padding: 10,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10
  },
  modalButtonText: {
    color: '#333',
    fontWeight: '600'
  }
});

export default Servicios;
