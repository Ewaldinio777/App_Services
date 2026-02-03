import React, { useState } from "react";
import { Alert, StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase-client";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useNavigation } from "@react-navigation/native";
import type { AuthStackParamList } from "../../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon, ArrowLeftIcon } from "../../../components/ui/icon";

export default function AuthPasswordRecovery() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();


  async function handleResetPassword() {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu email primero");
      return;
    }

    setLoading(true);
    
    try {
      // Método 1: Usar OTP directamente (sin deep link)
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        // Método 2: Usar recover (enviará un OTP)
        const { error: recoverError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://whxpvqdrgpxgjurvlczg.supabase.co/auth/v1/callback",
        });

        if (recoverError) {
          Alert.alert("Error", recoverError.message);
          return;
        }
      }

      // Navegar a la pantalla de verificación
      navigation.navigate("VerifyOTP", { 
        email, 
        type: "reset" 
      });

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >


        <View style={styles.content}>
            <Text style={styles.title}>Recupera tu cuenta</Text>
            <Text style={styles.subtitle}>Ingresa tu correo electrónico.</Text>

            <View style={styles.formContainer}>
                <Input
                    variant="outline"
                    size="lg"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}
                    style={styles.inputWrapper}
                >
                    <InputField
                      onChangeText={(text) => setEmail(text)}
                      value={email}
                      placeholder="Correo electrónico"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.inputField}
                    />
                </Input>
                
                <Text style={styles.helperText}>
                    Te enviaremos un código OTP para restablecer tu contraseña.
                </Text>

                <Button
                    disabled={loading}
                    onPress={() => handleResetPassword()}
                    size="lg"
                    style={styles.continueButton}
                >
                    <ButtonText>Continuar</ButtonText>
                </Button>

                <Button
                    onPress={() => navigation.navigate("Auth")}
                    variant="outline"
                    size="lg"
                    style={styles.secondaryButton}
                >
                    <ButtonText style={styles.secondaryButtonText}>Volver al inicio de sesión</ButtonText>
                </Button>
            </View>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    borderRadius: 8,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  inputField: {
    // optional
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 25,
    marginBottom: 16,
    backgroundColor: '#F97316', // Orange color
  },
  secondaryButton: {
    borderRadius: 25,
    borderColor: '#ccc',
  },
  secondaryButtonText: {
    color: '#000',
  },
});
