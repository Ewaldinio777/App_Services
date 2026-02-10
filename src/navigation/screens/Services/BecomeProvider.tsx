import React, { useState, useRef } from "react";
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

const AVAILABLE_SERVICES = [
  "Plomería",
  "Electricidad",
  "Limpieza",
];

const ID_TYPES = ["V", "E", "P", "J", "G", "R"];
const PHONE_PREFIXES = ["0414", "0424", "0412", "0422", "0416", "0426"];


const BecomeProvider: React.FC = () => {
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputYPositions = useRef<{ [key: string]: number }>({});

  const handleInputLayout = (id: string, event: any) => {
    inputYPositions.current[id] = event.nativeEvent.layout.y;
  };

  const scrollToInput = (id: string) => {
    const y = inputYPositions.current[id];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y, animated: true });
    }
  };

  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url?: string } | null>(null);

  // Split fields state
  const [idType, setIdType] = useState("V");
  const [idBody, setIdBody] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("0414");
  const [phoneBody, setPhoneBody] = useState("");
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showPhonePrefixModal, setShowPhonePrefixModal] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    experience: "",
    specialization: "",
  });

  React.useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [session]);

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

    const fullIdNumber = `${idType}-${idBody}`;
    const fullPhone = `${phonePrefix}-${phoneBody}`;

    const specializationArray = formData.specialization
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // Validaciones básicas
    if (
      !idBody ||
      !phoneBody ||
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
        .update({ is_provider: true, phone: fullPhone })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // Paso B: Insertar datos en providers
      const { error: providerError } = await supabase.from("providers").insert({
        id: session.user.id,
        id_number: fullIdNumber,
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image 
              source={{ uri: profile.avatar_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={50} color="#F97316" />
            </View>
          )}
        </View>

        <Text style={styles.title}>¡Hazte proveedor de servicio!</Text>
        <Text style={styles.subtitle}>
          Completa tus datos profesionales para empezar a ofrecer servicios.
        </Text>

        <View onLayout={(e) => handleInputLayout("cedula", e)}>
          <Text style={styles.label}>Cédula de Identidad *</Text>
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={styles.prefixSelector}
              onPress={() => setShowIdTypeModal(true)}
            >
              <Text style={styles.prefixText}>{idType}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Número de documento"
              value={idBody}
              onChangeText={setIdBody}
              keyboardType="phone-pad"
              maxLength={10}
              onFocus={() => scrollToInput("cedula")}
            />
          </View>
        </View>



        <View onLayout={(e) => handleInputLayout("telefono", e)}>
          <Text style={styles.label}>Número de Teléfono *</Text>
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={styles.prefixSelector}
              onPress={() => setShowPhonePrefixModal(true)}
            >
              <Text style={styles.prefixText}>{phonePrefix}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Número de Teléfono"
              keyboardType="phone-pad"
              value={phoneBody}
              onChangeText={setPhoneBody}
              maxLength={7}
              onFocus={() => scrollToInput("telefono")}
            />
          </View>
        </View>

                <Text style={styles.label}>Especialización *</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <View style={[styles.input, { justifyContent: "center" }]}>
            <Text style={{ color: formData.specialization ? "#000" : "#ccc" }}>
              {formData.specialization || "Seleccionar Servicios"}
            </Text>
          </View>
        </TouchableOpacity>

        <View onLayout={(e) => handleInputLayout("descripcion", e)}>
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
            onFocus={() => scrollToInput("descripcion")}
          />
        </View>

        <View onLayout={(e) => handleInputLayout("experiencia", e)}>
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
            onFocus={() => scrollToInput("experiencia")}
          />
        </View>

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

      {/* ID Type Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showIdTypeModal}
        onRequestClose={() => setShowIdTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalCenteredView}
          activeOpacity={1}
          onPressOut={() => setShowIdTypeModal(false)}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Tipo de Documento</Text>
            <FlatList
              data={ID_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setIdType(item);
                    setShowIdTypeModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={{ width: "100%" }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Phone Prefix Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPhonePrefixModal}
        onRequestClose={() => setShowPhonePrefixModal(false)}
      >
        <TouchableOpacity
          style={styles.modalCenteredView}
          activeOpacity={1}
          onPressOut={() => setShowPhonePrefixModal(false)}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Código de Área</Text>
            <FlatList
              data={PHONE_PREFIXES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setPhonePrefix(item);
                    setShowPhonePrefixModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={{ width: "100%" }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FCE7D6",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#F97316",
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
    color: "#F97316",
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: "#F97316",
    padding: 10,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  rowContainer: {
    flexDirection: "row",
    gap: 10,
  },
  prefixSelector: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  prefixText: {
    fontSize: 16,
    color: "#333",
  },
  flexInput: {
    flex: 1,
  },
});

export default BecomeProvider;
