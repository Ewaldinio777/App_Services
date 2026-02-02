import React, { useState } from "react";
import { Alert, StyleSheet, View, Modal, FlatList, TouchableOpacity } from "react-native";
import { supabase } from "../../../lib/supabase-client";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useNavigation } from "@react-navigation/native";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", 
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", 
  "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", 
  "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", 
  "Yaracuy", "Zulia"
];

export default function AuthSignUp() {
  // 1. Add State for First and Last Name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  async function signUpWithEmail() {
    setLoading(true);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // 2. Pass the state variables here
        data: {
          full_name: fullName || null,
          state: state || null,
          is_provider: false,
          // You can access this later via supabase.auth.user().user_metadata
        },
      },
    });



  if (error) {
  Alert.alert("Error de registro", error.message);
} else if (!session) {
  Alert.alert("¡Casi listo!", "Por favor revisa tu correo para confirmar tu cuenta.");
  navigation.navigate("Auth"); // Redirigir al login
}
}

  return (
    <View style={styles.container}>
      {/*First Name Input */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Nombre</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setFirstName}
            value={firstName}
            placeholder="Escribe tu nombre"
            autoCapitalize="words" 
          />
        </Input>
      </View>

      {/*Last Name Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Apellido</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setLastName}
            value={lastName}
            placeholder="Escribe tu apellido"
            autoCapitalize="words"
          />
        </Input>
      </View>

      {/* Address Input (State Picker) */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Dirección (Estado)</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <View style={[styles.input, { justifyContent: "center" }]}>
            <Text style={{ color: state ? "#000" : "#ccc" }}>
              {state || "Selecciona Estado"}
            </Text>
          </View>
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
            <Text style={[styles.label, { alignSelf: 'center', fontWeight: 'bold' }]}>Selecciona Estado</Text>
            <FlatList
              data={VENEZUELA_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setState(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400, width: "100%" }}
            />
            <Button
              onPress={() => setModalVisible(false)}
              size="sm"
              variant="outline"
              action="secondary"
              style={{ marginTop: 15, width: '100%' }}
            >
              <ButtonText>Cancelar</ButtonText>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Email Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Input>
      </View>

      {/* Password Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Contraseña</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            placeholder="Escribe tu contraseña"
            secureTextEntry={true}
            autoCapitalize="none"
          />
        </Input>
      </View>

      <View style={styles.verticallySpaced}>
        <Button disabled={loading} onPress={() => signUpWithEmail()}>
          <ButtonText>Registrarse</ButtonText>
        </Button>
      </View>
      
      <View style={styles.verticallySpaced}>
        <Button
          onPress={() => navigation.navigate("Auth")}
          variant="solid"
          size="md"
          action="secondary"
        >
          <ButtonText>¿Ya tienes una cuenta? Inicia Sesión</ButtonText>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  label: {
    marginBottom: 6,
    fontSize: 16,
    color: "#444",
  },
  input: {
    height: 44,
    borderColor: "#ccc",
    color: "#000",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    color: "#333",
  },
});
