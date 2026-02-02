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
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Provider, Profile, Review } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";

type ProviderDetailRouteProp = RouteProp<RootStackParamList, "ProviderDetail">;

type ReviewWithOrder = Review & {
  orders?: {
    provider_id: string;
  } | null;
  reviewer_profile?: {
    full_name: string;
  } | null;
};

const ProviderDetail: React.FC = () => {
  const { session } = useAuth();
  const route = useRoute<ProviderDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { providerId } = route.params;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<ReviewWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);

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
        .eq("id", providerData.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*, orders!inner(provider_id), reviewer_profile:profiles!reviewer_id(full_name)")
        .eq("orders.provider_id", providerId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;
      
      const rawReviews = (reviewsData || []) as unknown as ReviewWithOrder[];
      const sanitizedReviews = rawReviews.map(
        ({ orders, ...review }) => review
      );
      setReviews(sanitizedReviews);

      // Calculate and update average rating
      if (sanitizedReviews.length > 0) {
        const totalRating = sanitizedReviews.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = totalRating / sanitizedReviews.length;

        // Check if we need to update
        if (Math.abs((providerData.rating || 0) - averageRating) > 0.01 || providerData.total_reviews !== sanitizedReviews.length) {
           setProvider(prev => prev ? ({ ...prev, rating: averageRating, total_reviews: sanitizedReviews.length }) : null);
           
           // Update in DB silently
           supabase.from('providers').update({
             rating: averageRating,
             total_reviews: sanitizedReviews.length
           }).eq('id', providerId).then(({ error }) => {
             if (error) console.error("Error updating provider rating:", error);
           });
        }
      }

    } catch (error) {
      console.error("Error loading provider details:", error);
      Alert.alert("Error", "No se pudo cargar la información del proveedor");
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = async () => {
    try {
      if (!session?.user || !profile?.id) {
        Alert.alert("Error", "No se pudo iniciar el chat");
        return;
      }

      if (session.user.id === profile.id) {
        Alert.alert("Aviso", "No puedes chatear contigo mismo");
        return;
      }

      const participantA = session.user.id;
      const participantB = profile.id;

      const { data: existingChats, error: existingError } = await supabase
        .from("chats")
        .select("id")
        .or(
          `and(participant_1_id.eq.${participantA},participant_2_id.eq.${participantB}),and(participant_1_id.eq.${participantB},participant_2_id.eq.${participantA})`
        )
        .limit(1);

      if (existingError) throw existingError;

      let chatId = existingChats?.[0]?.id;

      // Navigate to Chats with either existing chatId or otherParticipantId to create one later
      navigation.navigate("MainTabs", {
        screen: "Chats",
        params: chatId 
          ? { chatId }
          : { otherParticipantId: participantB },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      Alert.alert("Error", "No se pudo iniciar el chat");
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.providerName}>{profile.full_name || "Proveedor"}</Text>
        <Text style={styles.specialization}>
          {Array.isArray(provider.specialization)
            ? provider.specialization.join(", ")
            : provider.specialization}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.ratingText}>
            {provider.rating?.toFixed(1) || "Sin calificaciones"} 
            {provider.total_reviews ? ` (${provider.total_reviews})` : ""}
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
          <Text style={styles.infoText}>{profile.phone || "No disponible"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={20} color="#007AFF" />
          <Text style={styles.infoText}>{provider.id_number}</Text>
        </View>
      </View>

      {reviews.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: isReviewsExpanded ? 10 : 0 }}
            onPress={() => setIsReviewsExpanded(!isReviewsExpanded)}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Reseñas</Text>
            <Ionicons name={isReviewsExpanded ? "chevron-up" : "chevron-down"} size={24} color="#666" />
          </TouchableOpacity>

          {isReviewsExpanded && reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <Text style={styles.reviewerName}>
                {review.reviewer_profile?.full_name || "Usuario"}
              </Text>
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
    color: "#333",
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
contactButton: {
  flexDirection: "row",
  backgroundColor: "#007AFF",
  margin: 20,
  marginBottom: 4,
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
