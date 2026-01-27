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
  Modal,
  FlatList,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { useNavigation } from "@react-navigation/native";

const AVAILABLE_SERVICES = [
  "Plomería",
  "Electricidad",
  "Limpieza",
];

const BecomeProvider: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    id_number: "",
    phone: "",
    description: "",
    experience: "",
    specialization: "",
  });

  const toggleService = (service: string) => {
    const current = formData.specialization
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    let newServices;
    if (current.includes(service)) {
      newServices = current.filter((s) => s !== service);
    } else {
      newServices = [...current, service];
    }
    setFormData({ ...formData, specialization: newServices.join(", ") });
  };

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
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <View style={[styles.input, { justifyContent: "center" }]}>
            <Text style={{ color: formData.specialization ? "#000" : "#ccc" }}>
              {formData.specialization || "Seleccionar Servicios"}
            </Text>
          </View>
        </TouchableOpacity>

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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar Servicios</Text>
            <FlatList
              data={AVAILABLE_SERVICES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = formData.specialization
                  .split(",")
                  .map((s) => s.trim())
                  .includes(item);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => toggleService(item)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextSelected,
                      ]}
                    >
                      {item} {isSelected ? "✓" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 400, width: "100%" }}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "85%",
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
  modalItemSelected: {
    backgroundColor: "#e6f7ff",
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemTextSelected: {
    fontWeight: "bold",
    color: "#007AFF",
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default BecomeProvider;
