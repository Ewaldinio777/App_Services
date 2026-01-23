import React, { useState } from "react";
import { Alert, StyleSheet, View, TouchableOpacity } from "react-native";
import { supabase } from "../../../lib/supabase-client";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useNavigation } from "@react-navigation/native";
import type { AuthStackParamList } from "../../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export default function AuthPasswordRecovery() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        // Esto enviará un OTP sin necesidad de deep link
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
    <View style={styles.container}>
        <View style={[styles.verticallySpaced, styles.mt20]}>
            <Text style={styles.title}>Recuperar Contraseña</Text>

          <Text style={styles.label}>Ingresa tu Correo</Text>
          <Input
            variant="outline"
            size="md"
            isDisabled={false}
            isInvalid={false}
            isReadOnly={false}
          >
            <InputField
              style={styles.input}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Input>
        </View>

        <View style={styles.verticallySpaced}>
          <Button
            disabled={loading}
            onPress={() => handleResetPassword()}
            variant="solid"
            size="md"
            action="primary"
          >
            <ButtonText>Enviar Código al Correo</ButtonText>
          </Button>
        </View>

              <TouchableOpacity
                onPress={() => navigation.navigate("Auth")}
                style={styles.backText}
              >
                <Text style={styles.backText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>

        </View>
    ); 

}

const styles = StyleSheet.create({
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
    mt20: { 
    marginTop: 20,
    },
    container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
    },

  backText: {
    color: "#007AFF",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    },

    title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    },
    subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    },
    label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    },
    input: {
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
    color: "#000",
    },
});