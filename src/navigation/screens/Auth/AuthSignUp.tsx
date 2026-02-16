import React, { useState } from "react";
import { Alert, StyleSheet, View, Modal, FlatList, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase-client";
import { useAuth } from "../../../context/AuthContext";
import { translateError } from "../../../lib/error-translator";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField, InputSlot, InputIcon } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { VStack } from "../../../components/ui/vstack";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types";
import { EyeIcon, EyeOffIcon } from "../../../components/ui/icon";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", 
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", 
  "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", 
  "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", 
  "Yaracuy", "Zulia"
];

export default function AuthSignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUpAndSignOut } = useAuth();

  const handleState = () => {
    setShowPassword((showState) => {
      return !showState
    })
  }

  const handleConfirmState = () => {
    setShowConfirmPassword((showState) => {
      return !showState
    })
  }

  async function signUpWithEmail() {
    setLoading(true);

    if (password !== confirmPassword) {
      setLoading(false);
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const {
      data: { session },
      error,
    } = await signUpAndSignOut({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName || null,
          state: state || null,
          is_provider: false,
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error de registro", translateError(error.message));
    } else {
      Alert.alert("Registro Exitoso", "Tu cuenta ha sido creada. Por favor inicia sesión.");
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
             <Image 
                source={require('../../../../assets/LOGO.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
          </View>

          <VStack space="md" style={styles.formContainer}>
            <View style={styles.nameContainer}>
                <Input variant="outline" size="lg" style={[styles.inputWrapper, { flex: 1, marginRight: 5 }]}>
                  <InputField
                    style={styles.inputField}
                    onChangeText={setFirstName}
                    value={firstName}
                    placeholder="Nombre"
                    autoCapitalize="words" 
                  />
                </Input>
                <Input variant="outline" size="lg" style={[styles.inputWrapper, { flex: 1, marginLeft: 5 }]}>
                  <InputField
                    style={styles.inputField}
                    onChangeText={setLastName}
                    value={lastName}
                    placeholder="Apellido"
                    autoCapitalize="words"
                  />
                </Input>
            </View>

            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <View style={[styles.inputWrapper, styles.pickerContainer]}>
                <Text style={{ color: state ? "#000" : "#ccc", fontSize: 16 }}>
                  {state || "Selecciona Estado"}
                </Text>
              </View>
            </TouchableOpacity>

            <Input variant="outline" size="lg" style={styles.inputWrapper}>
              <InputField
                style={styles.inputField}
                onChangeText={setEmail}
                value={email}
                placeholder="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Input>

            <Input variant="outline" size="lg" style={styles.inputWrapper}>
              <InputField
                style={styles.inputField}
                onChangeText={setPassword}
                value={password}
                placeholder="Contraseña"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <InputSlot onPress={handleState} style={{ paddingRight: 10 }}>
                <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
              </InputSlot>
            </Input>

            <Input variant="outline" size="lg" style={styles.inputWrapper}>
              <InputField
                style={styles.inputField}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                placeholder="Confirmar Contraseña"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <InputSlot onPress={handleConfirmState} style={{ paddingRight: 10 }}>
                <InputIcon as={showConfirmPassword ? EyeIcon : EyeOffIcon} />
              </InputSlot>
            </Input>

            <Button disabled={loading} onPress={() => signUpWithEmail()} size="lg" style={styles.registerButton}>
              <ButtonText>Registrarte</ButtonText>
            </Button>
            
            <TouchableOpacity onPress={() => navigation.navigate("Auth")} style={styles.loginLinkContainer}>
                <Text style={styles.loginLinkText}>¿Ya tienes una cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>

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
              style={styles.modalList}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
     width: 150,
    height: 150,
  },
  formContainer: {
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  inputWrapper: {
    borderRadius: 8,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    marginBottom: 0, // Vstack handles spacing mostly, but be careful
  },
  inputField: {
    fontSize: 16,
  },
  pickerContainer: {
    height: 48, // approximate lg input height
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  registerButton: {
    borderRadius: 25,
    marginTop: 10,
    backgroundColor: '#F97316', // Orange color
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#F97316', // Orange color
    fontWeight: 'bold',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    color: "#444",
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
    maxHeight: '80%',
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
  modalList: {
    minWidth: '100%',
  }
});
