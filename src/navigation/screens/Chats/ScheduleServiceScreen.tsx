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
import CustomDateTimePicker from "@/src/components/ui/CustomDateTimePicker";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../types";
import { Ionicons } from "@react-native-vector-icons/ionicons";

type ScheduleServiceRouteProp = RouteProp<RootStackParamList, "ScheduleService">;

export default function ScheduleServiceScreen() {
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                 <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Solicitud de Servicio</Text>
      </View>

      <Text style={styles.sectionTitle}>Ingresa la información para solicitar el servicio</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Fecha y Hora</Text>
        <TouchableOpacity 
            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            onPress={() => setShowPicker(true)}
        >
             <Text>{selectedDate.toLocaleDateString()} - {selectedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}</Text>
             <Ionicons name="calendar-outline" size={20} color="#666" />
        </TouchableOpacity>
        
        <CustomDateTimePicker
            visible={showPicker}
            initialDate={selectedDate}
            onClose={() => setShowPicker(false)}
            onSelect={handleDateSelect}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ingresa la Dirección</Text>
        <TextInput
            style={styles.input}
            placeholder="Dirección donde se llevará a cabo el servicio"
            value={address}
            onChangeText={setAddress}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Detalles de Solicitud</Text>

      <View style={styles.card}>
        <View style={styles.providerHeader}>
            {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
            )}
            <Text style={styles.providerName}>{profile?.full_name || "Nombre Proveedor"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nro de Cedula</Text>
            <Text style={styles.detailValue}>{provider?.id_number || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Teléfono</Text>
            {/* Show provider phone, or profile phone, or N/A */}
            <Text style={styles.detailValue}>{provider?.phone || profile?.phone || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Título del Servicio</Text>
            <TextInput
                style={[styles.input, { backgroundColor: '#fff', marginTop: 4 }]}
                placeholder="Ej: Revisión de tubería, Limpieza profunda..."
                value={requestTitle}
                onChangeText={setRequestTitle}
            />
        </View>
        
        <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Descripción del Servicio</Text>
            <TextInput
                style={[styles.input, { backgroundColor: '#fff', marginTop: 4, height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe el problema o trabajo a realizar..."
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
              <Text style={styles.scheduleButtonText}>Agendar</Text>
          )}
      </TouchableOpacity>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: 20,
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
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    backgroundColor: '#f9f9f9', // Light gray background like image
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8, // Square with rounded corners
    marginRight: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
    borderStyle: 'dashed', // Attempting dashed effect
    borderWidth: 1,
    borderColor: '#ccc', 
  },
  detailRow: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  detailBlock: {
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceDesc: {
    fontSize: 14,
    color: '#666',
  },
  scheduleButton: {
    backgroundColor: '#6B4EFF', // Purple/Blue color
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 'auto',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
