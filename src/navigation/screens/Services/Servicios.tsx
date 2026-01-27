import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation } from "@react-navigation/native";
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
      setLoading(true);
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
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hola{userName ? "," : ""}</Text>
          <Text style={styles.userNameText}>{userName || "Bienvenido"}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Notificaciones")}
          >
            <Ionicons name="notifications" size={26} color="#007AFF" />
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
              <Ionicons name="briefcase" size={18} color="#fff" />
              <Text style={styles.becomeProviderText}>Ser Proveedor</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>¿Deseas ofrecer tus servicios?</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#9AA0A6" />
          <TextInput
            placeholder="Buscar por nombre"
            placeholderTextColor="#9AA0A6"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#9AA0A6" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, { marginLeft: 10 }]}
          onPress={() => setIsFilterOpen((prev) => !prev)}
        >
          <Ionicons name="filter" size={18} color="#007AFF" />
          <Text style={styles.filterText}>
            {selectedCategory === "Todos" ? "Categoría" : selectedCategory}
          </Text>
          <Ionicons name={isFilterOpen ? "chevron-up" : "chevron-down"} size={16} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, { marginLeft: 10 }]}
          onPress={() => setIsStateModalVisible(true)}
        >
          <Ionicons name="location-outline" size={18} color="#007AFF" />
          <Text style={styles.filterText}>
            {selectedState === "Todos" ? "Estado" : selectedState}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#007AFF" />
        </TouchableOpacity>
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
                  <Text style={[styles.modalItemText, selectedCategory === item && { color: "#007AFF", fontWeight: "bold" }]}>
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
                  <Text style={[styles.modalItemText, selectedState === item && { color: "#007AFF", fontWeight: "bold" }]}>
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
                <Ionicons name="person-circle" size={46} color="#007AFF" />
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>
                    {provider.profile?.full_name || "Proveedor"}
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
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.providerActions}>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
                >
                  <Text style={styles.messageButtonText}>Mensaje</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
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
  promptContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  filterOptions: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F2F4F7',
  },
  filterOptionActive: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  providersSection: {
    padding: 20,
    paddingTop: 10,
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
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    color: '#111827',
  },
  providerSpecialization: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
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
    alignItems: 'flex-end',
  },
  messageButton: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
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
