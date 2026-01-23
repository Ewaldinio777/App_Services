import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { useNavigation } from "@react-navigation/native";

const BecomeProvider: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id_number: "",
    phone: "",
    description: "",
    experience: "",
    specialization: "",
  });

  const handleBecomeProvider = async () => {
    if (!session?.user) return;

    const specializationArray = formData.specialization
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // Validaciones básicas
    if (
      !formData.id_number ||
      !formData.phone ||
      !formData.description ||
      specializationArray.length === 0
    ) {
      Alert.alert(
        "Error",
        "Por favor completa todos los campos obligatorios."
      );
      return;
    }

    setSubmitting(true);
    try {
      // Paso A: Actualizar is_provider en profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_provider: true, phone: formData.phone })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // Paso B: Insertar datos en providers
      const { error: providerError } = await supabase.from("providers").insert({
        id: session.user.id,
        id_number: formData.id_number,
        description: formData.description,
        experience: formData.experience,
        specialization: specializationArray,
      });

      if (providerError) throw providerError;

      Alert.alert(
        "¡Éxito!",
        "Ahora eres un proveedor de servicios.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Ocurrió un error al registrarte.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>¡Hazte proveedor de servicio!</Text>
        <Text style={styles.subtitle}>
          Completa tus datos profesionales para empezar a ofrecer servicios.
        </Text>

        <Text style={styles.label}>Cédula / RIF *</Text>
        <TextInput
          style={styles.input}
          placeholder="V-12345678"
          value={formData.id_number}
          onChangeText={(text) =>
            setFormData({ ...formData, id_number: text })
          }
        />

        <Text style={styles.label}>Especialización *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Plomería, Electricidad, Limpieza"
          value={formData.specialization}
          onChangeText={(text) =>
            setFormData({ ...formData, specialization: text })
          }
        />

        <Text style={styles.label}>Teléfono de contacto *</Text>
        <TextInput
          style={styles.input}
          placeholder="0414-1234567"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
        />

        <Text style={styles.label}>Descripción de tu perfil *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Soy plomero con 10 años de experiencia..."
          multiline
          numberOfLines={3}
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
        />

        <Text style={styles.label}>Experiencia Previa</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Trabajé en la empresa X..."
          multiline
          numberOfLines={3}
          value={formData.experience}
          onChangeText={(text) =>
            setFormData({ ...formData, experience: text })
          }
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleBecomeProvider}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Finalizar y Convertirme en Proveedor
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default BecomeProvider;
