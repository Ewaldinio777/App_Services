import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../types";
import { supabase } from "@/src/lib/supabase-client";
import { Provider, Profile } from "@/src/types/database.types";

type ServiciosLimpiezaRouteProp = RouteProp<RootStackParamList, "ServiciosLimpieza">;

const ServiciosLimpieza: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ServiciosLimpiezaRouteProp>();
  const { category } = route.params;
  
  const [providers, setProviders] = useState<(Provider & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          profile:profiles(*)
        `)
        .ilike('specialization', `%limpieza%`)
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
      <View style={styles.container}>
        <Text style={styles.title}>Servicios de {category}</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay proveedores de {category} disponibles</Text>
          </View>
        ) : (
          providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
            >
              <View style={styles.providerHeader}>
                <Ionicons name="person-circle" size={50} color="#007AFF" />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>
                    {provider.profile?.full_name || "Proveedor"}
                  </Text>
                  <Text style={styles.providerSpecialization}>
                    {provider.specialization}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {provider.rating?.toFixed(1) || "Nuevo"}
                    </Text>
                    {provider.reviews_count ? (
                      <Text style={styles.reviewsCount}> ({provider.reviews_count})</Text>
                    ) : null}
                  </View>
                </View>
              </View>
              <Text style={styles.providerDescription} numberOfLines={2}>
                {provider.description}
              </Text>
              <View style={styles.providerFooter}>
                <View style={styles.contactInfo}>
                  <Ionicons name="call" size={16} color="#007AFF" />
                  <Text style={styles.phoneText}>{provider.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  providerCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  providerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
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
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  reviewsCount: {
    fontSize: 12,
    color: '#999',
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  providerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007AFF',
  },
});

export default ServiciosLimpieza;
