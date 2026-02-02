import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomDateTimePicker from "@/src/components/ui/CustomDateTimePicker";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../types";
import { Ionicons } from "@react-native-vector-icons/ionicons";

type ScheduleServiceRouteProp = RouteProp<RootStackParamList, "ScheduleService">;

export default function ScheduleServiceScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const route = useRoute<ScheduleServiceRouteProp>();
  const navigation = useNavigation<any>();
  const { providerId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [service, setService] = useState<any>(null);

  // Form state
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchData();
  }, [providerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Get Provider Info
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // 2. Get Profile Info (Name, Avatar)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", providerData.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // 3. Get First Service (To populate Service Title/Description)
      // Assumption: We pick the first available service for this provider
      const { data: servicesData, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("provider_id", providerId)
        .limit(1);

      if (serviceError) throw serviceError;
      if (servicesData && servicesData.length > 0) {
        setService(servicesData[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "No se pudo cargar la información necesaria.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowPicker(false);
  };

  const handleSchedule = async () => {
    if (!requestTitle || !requestDescription || !address) {
      Alert.alert("Error", "Por favor completa todos los campos (Título, Descripción, Dirección)");
      return;
    }
    // if (!service) {
    //   Alert.alert("Error", "Este proveedor no tiene servicios configurados para agendar.");
    //   return;
    // }

    try {
        setSubmitting(true);
        // Create Order
        
        const { error } = await supabase.from("orders").insert({
            client_id: session?.user.id,
            provider_id: provider.id, 
            // service_id: service?.id, // Removed as it doesn't exist in schema
            status: "pendiente",
            title: requestTitle, 
            description: requestDescription,
            // total_price: service?.price || 0, // Removed as it doesn't exist in schema
            scheduled_date: selectedDate.toISOString().split('T')[0],
            scheduled_time: selectedDate.toTimeString().split(' ')[0],
            delivery_address: address,
            service_type: requestTitle // Using title as service_type for now
        });

        if (error) throw error;

        // --- NOTIFICATION LOGIC ---
        // Notify Provider about New Request
        // We need client name
        const { data: clientProfile } = await supabase.from('profiles').select('full_name').eq('id', session?.user.id).single();
        const clientName = clientProfile?.full_name || "Un usuario";

        await supabase.from('notifications').insert({
              user_id: provider.id,
              title: "¡Nueva Solicitud de Servicio!",
              body: `${clientName} solicita un servicio de ${requestTitle}. Responde antes de que expire.`,
              type: 'order',
              related_id: provider.id, // Or orderId if we returned it, but let's point to general orders or keep generic
              is_read: false
        });
        // --------------------------

        Alert.alert("Éxito", "Tu solicitud ha sido enviada.", [
            { text: "OK", onPress: () => navigation.navigate("MainTabs", { screen: "Ordenes" }) }
        ]);

    } catch (error) {
        console.error("Error creating order:", error);
        Alert.alert("Error", "No se pudo agendar la cita. Verifica la conexión.");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      
      {/* Header Estilo ChatDetail */}
      <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Ionicons name="arrow-back" size={24} color="#000" />
                 <Text style={[styles.headerTitle, { marginLeft: 20 }]}>Solicitud de Servicio</Text>
            </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Ingresa la información</Text>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Fecha y Hora</Text>
            <TouchableOpacity 
                style={styles.compactInput}
                onPress={() => setShowPicker(true)}
            >
                    <Text style={styles.inputText} numberOfLines={1}>{selectedDate.toLocaleDateString()} {selectedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
            </TouchableOpacity>
            <CustomDateTimePicker
                visible={showPicker}
                initialDate={selectedDate}
                onClose={() => setShowPicker(false)}
                onSelect={handleDateSelect}
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Dirección</Text>
            <View style={styles.compactInput}>
                <TextInput
                    style={{ flex: 1, color: '#333', paddingVertical: 0 }}
                    placeholder="Dirección del servicio"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                />
                <Ionicons name="location-outline" size={18} color="#666" />
            </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Detalles de Solicitud</Text>

        <View style={styles.card}>
          <View style={styles.providerHeader}>
              {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                     <Ionicons name="person" size={24} color="#999" />
                  </View>
              )}
              <View style={{flex: 1}}>
                  <Text style={styles.providerName}>{profile?.full_name || "Nombre Proveedor"}</Text>
                  
                  <View style={styles.infoRowContainer}>
                     <View style={styles.infoItem}>
                        <Ionicons name="card-outline" size={14} color="#666" style={{marginRight: 4}} />
                        <Text style={styles.detailValue}>{provider?.id_number || "N/A"}</Text>
                     </View>
                     <View style={styles.infoItem}>
                        <Ionicons name="call-outline" size={14} color="#666" style={{marginRight: 4}} />
                        <Text style={styles.detailValue}>{provider?.phone || profile?.phone || "N/A"}</Text>
                     </View>
                  </View>
              </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Título del Servicio</Text>
              <TextInput
                  style={[styles.input, { backgroundColor: '#fff', marginTop: 4, paddingVertical: 8 }]}
                  placeholder="Ej: Revisión de tubería..."
                  value={requestTitle}
                  onChangeText={setRequestTitle}
              />
          </View>
          
          <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Descripción</Text>
              <TextInput
                  style={[styles.input, { backgroundColor: '#fff', marginTop: 4, height: 60, textAlignVertical: 'top', paddingVertical: 8 }]}
                  placeholder="Detalles del trabajo..."
                  value={requestDescription}
                  onChangeText={setRequestDescription}
                  multiline
              />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.scheduleButton}
          onPress={handleSchedule}
          disabled={submitting}
        >
            {submitting ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <>
                <Ionicons name="calendar" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.scheduleButtonText}>Agendar</Text>
                </>
            )}
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 4,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8, // Reduced
    color: '#000',
  },
  formGroup: {
    marginBottom: 12, // Reduced
  },
  compactRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 10, // Reduced
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  compactInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48, // Fixed height for alignment
  },
  inputText: {
      fontSize: 13,
      color: '#333',
      flex: 1,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12, // Reduced
    marginBottom: 16, // Reduced
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12, // More rounded
    marginRight: 12,
  },
  avatarPlaceholder: {
      backgroundColor: '#e1e1e1',
      justifyContent: 'center',
      alignItems: 'center',
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoRowContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
  },
  infoItem: {
     flexDirection: 'row',
     alignItems: 'center',
     marginRight: 12,
  },
  detailValue: {
    fontSize: 13,
    color: '#555',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 1, 
  },
  detailBlock: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  scheduleButton: {
    backgroundColor: '#F97316',
    padding: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

