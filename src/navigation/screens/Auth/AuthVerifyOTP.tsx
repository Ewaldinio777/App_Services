import React, { useState, useEffect } from "react";
import { Alert, StyleSheet, View, TouchableOpacity } from "react-native";
import { supabase } from "../../../lib/supabase-client";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function AuthVerifyOTP() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"reset" | "signup">("reset");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (route.params) {
      const { email: routeEmail, type: routeType } = route.params as any;
      setEmail(routeEmail);
      setType(routeType || "reset");
    }
  }, [route.params]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  async function handleVerifyOTP() {
    if (!otp) {
      Alert.alert("Error", "Por favor ingresa el código OTP");
      return;
    }

    if (type === "reset") {
      if (!newPassword || !confirmPassword) {
        Alert.alert("Error", "Por favor ingresa la nueva contraseña");
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "Las contraseñas no coinciden");
        return;
      }
    }

    setLoading(true);

    try {
      if (type === "reset") {
        // Verificar el token OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

        if (verifyError) {
          Alert.alert("Error", "Código OTP inválido o expirado");
          return;
        }

        // Actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          Alert.alert("Error", updateError.message);
          return;
        }

        Alert.alert(
          "Éxito",
          "Tu contraseña ha sido restablecida exitosamente. La próxima vez que inicies sesión, usa tu nueva contraseña.",
          [
            {
              text: "OK",
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "expousermanagement://reset-password",
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Éxito", "Se ha enviado un nuevo código OTP");
      setTimer(60);
      setCanResend(false);
      setOtp("");
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificar Código OTP</Text>
      <Text style={styles.subtitle}>
        Hemos enviado un código de 6 dígitos a {email}
      </Text>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Código OTP</Text>
        <Input
          variant="outline"
          size="md"
        >
          <InputField
            style={styles.input}
            onChangeText={setOtp}
            value={otp}
            placeholder="Ingresa el código de 6 dígitos"
            keyboardType="number-pad"
            maxLength={6}
          />
        </Input>
      </View>

      {type === "reset" && (
        <>
          <View style={styles.verticallySpaced}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <Input
              variant="outline"
              size="md"
            >
              <InputField
                style={styles.input}
                onChangeText={setNewPassword}
                value={newPassword}
                placeholder="Nueva contraseña"
                secureTextEntry={true}
              />
            </Input>
          </View>

          <View style={styles.verticallySpaced}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <Input
              variant="outline"
              size="md"
            >
              <InputField
                style={styles.input}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                placeholder="Confirmar contraseña"
                secureTextEntry={true}
              />
            </Input>
          </View>
        </>
      )}

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          disabled={loading || !otp || (type === "reset" && (!newPassword || !confirmPassword))}
          onPress={handleVerifyOTP}
        >
          <ButtonText>
            {type === "reset" ? "Restablecer Contraseña" : "Verificar Código"}
          </ButtonText>
        </Button>
      </View>

      <View style={styles.resendContainer}>
        {!canResend ? (
          <Text style={styles.timerText}>
            Reenviar código en {timer} segundos
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
            <Text style={styles.resendText}>Reenviar código OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Auth")}
        style={styles.backLink}
      >
        <Text style={styles.backText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
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
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  timerText: {
    color: "#666",
    fontSize: 14,
  },
  resendText: {
    color: "#F97316",
    fontSize: 16,
  },
  backLink: {
    marginTop: 30,
    alignItems: "center",
  },
  backText: {
    color: "#F97316",
    fontSize: 16,
  },
});
