import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Provider, Profile, Review } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRoute, RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

type ProviderDetailRouteProp = RouteProp<RootStackParamList, "ProviderDetail">;

const ProviderDetail: React.FC = () => {
  const { session } = useAuth();
  const route = useRoute<ProviderDetailRouteProp>();
  const { providerId } = route.params;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderDetails();
  }, [providerId]);

  const loadProviderDetails = async () => {
    try {
      // Load provider data
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", providerData.profile_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error loading provider details:", error);
      Alert.alert("Error", "No se pudo cargar la información del proveedor");
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = () => {
    if (provider) {
      Alert.alert(
        "Contactar Proveedor",
        `Teléfono: ${provider.phone}`,
        [{ text: "OK" }]
      );
    }
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

  if (!provider || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Text>Proveedor no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.providerName}>{profile.full_name || "Proveedor"}</Text>
        <Text style={styles.specialization}>{provider.specialization}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.ratingText}>
            {provider.rating?.toFixed(1) || "Sin calificaciones"} 
            {provider.reviews_count ? ` (${provider.reviews_count})` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.description}>{provider.description}</Text>
      </View>

      {provider.experience && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experiencia</Text>
          <Text style={styles.description}>{provider.experience}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Contacto</Text>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#007AFF" />
          <Text style={styles.infoText}>{provider.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={20} color="#007AFF" />
          <Text style={styles.infoText}>{provider.id_number}</Text>
        </View>
      </View>

      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reseñas</Text>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.rating ? "star" : "star-outline"}
                      size={16}
                      color="#FFD700"
                    />
                  ))}
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString("es-ES")}
                </Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.contactButton}
        onPress={handleContactProvider}
      >
        <Ionicons name="call" size={24} color="#fff" />
        <Text style={styles.contactButtonText}>Contactar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatarContainer: {
    marginBottom: 10,
  },
  providerName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  specialization: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#333",
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
  reviewItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: "row",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  reviewComment: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  contactButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default ProviderDetail;
