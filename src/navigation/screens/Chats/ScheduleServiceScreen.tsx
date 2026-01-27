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
} from "react-native";
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
  // Simple text inputs as per request for "Date and Time" and "Address"
  // In a real app, use a DatePicker
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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

  const handleSchedule = async () => {
    if (!date || !time || !address) {
      Alert.alert("Error", "Por favor completa todos los campos (Fecha, Hora, Dirección)");
      return;
    }
    if (!service) {
      Alert.alert("Error", "Este proveedor no tiene servicios configurados para agendar.");
      return;
    }

    try {
        setSubmitting(true);
        // Create Order
        
        const { error } = await supabase.from("orders").insert({
            client_id: session?.user.id,
            provider_id: provider.id, 
            service_id: service.id,
            status: "pending",
            description: service.description,
            total_price: service.price || 0,
            scheduled_date: date,
            scheduled_time: time,
            delivery_address: address
        });

        if (error) throw error;

        Alert.alert("Éxito", "Tu solicitud ha sido enviada.", [
            { text: "OK", onPress: () => navigation.navigate("MainTabs", { screen: "Ordenes" }) }
        ]);

    } catch (error) {
        console.error("Error creating order:", error);
        Alert.alert("Error", "No se pudo agendar la cita.");
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                 <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Solicitud de Servicio</Text>
      </View>

      <Text style={styles.sectionTitle}>Enter Your Information</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date and Time</Text>
        <View style={styles.row}>
            <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="26 May (Monday)"
                value={date}
                onChangeText={setDate}
            />
            <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="9:30 AM"
                value={time}
                onChangeText={setTime}
            />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Enter Address</Text>
        <TextInput
            style={styles.input}
            placeholder="2562 Road Dhaka, Bangladesh"
            value={address}
            onChangeText={setAddress}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Detalles del Servicio</Text>

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
            <Text style={styles.detailValue}>{provider?.phone || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Título del servicio</Text>
            <Text style={styles.serviceTitle}>{service?.title || provider?.specialization || "Servicio General"}</Text>
        </View>
        
        <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Descripción del servicio</Text>
            <Text style={styles.serviceDesc}>{service?.description || provider?.description || "Sin descripción"}</Text>
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
