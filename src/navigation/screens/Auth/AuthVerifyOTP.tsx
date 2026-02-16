import React, { useState, useEffect } from "react";
import { Alert, StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase-client";
import { translateError } from "../../../lib/error-translator";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField, InputSlot, InputIcon } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { VStack } from "../../../components/ui/vstack";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Icon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from "../../../components/ui/icon";

export default function AuthVerifyOTP() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"reset" | "signup">("reset");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  const handleNewPasswordState = () => {
    setShowNewPassword((showState) => !showState);
  };

  const handleConfirmPasswordState = () => {
    setShowConfirmPassword((showState) => !showState);
  };

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
          Alert.alert("Error", translateError(updateError.message));
          return;
        }

        Alert.alert(
          "Éxito",
          "Tu contraseña ha sido restablecida exitosamente. La próxima vez que inicies sesión, usa tu nueva contraseña.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Auth" as never),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", translateError(error.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://whxpvqdrgpxgjurvlczg.supabase.co/auth/v1/callback", 
    });

    if (error) {
      Alert.alert("Error", translateError(error.message));
    } else {
      Alert.alert("Éxito", "Se ha enviado un nuevo código OTP");
      setTimer(60);
      setCanResend(false);
      setOtp("");
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                 <Icon as={ArrowLeftIcon} size="xl" className="text-black" />
            </TouchableOpacity>
        </View>

        <View style={styles.content}>
            <Text style={styles.title}>Verificar Código</Text>
            <Text style={styles.subtitle}>Hemos enviado un código de 6 dígitos a {email}</Text>

            <VStack space="md" style={styles.formContainer}>
                <Input
                    variant="outline"
                    size="lg"
                    style={styles.inputWrapper}
                >
                    <InputField
                      onChangeText={setOtp}
                      value={otp}
                      placeholder="Código OTP (6 dígitos)"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.inputField}
                    />
                </Input>
                
                {type === 'reset' && (
                    <>
                        <Input variant="outline" size="lg" style={styles.inputWrapper}>
                        <InputField
                            onChangeText={setNewPassword}
                            value={newPassword}
                            placeholder="Nueva contraseña"
                            secureTextEntry={!showNewPassword}
                            style={styles.inputField}
                        />
                        <InputSlot onPress={handleNewPasswordState} style={{ paddingRight: 10 }}>
                          <InputIcon as={showNewPassword ? EyeIcon : EyeOffIcon} />
                        </InputSlot>
                        </Input>
                        <Input variant="outline" size="lg" style={styles.inputWrapper}>
                        <InputField
                            onChangeText={setConfirmPassword}
                            value={confirmPassword}
                            placeholder="Confirmar contraseña"
                            secureTextEntry={!showConfirmPassword}
                            style={styles.inputField}
                        />
                        <InputSlot onPress={handleConfirmPasswordState} style={{ paddingRight: 10 }}>
                          <InputIcon as={showConfirmPassword ? EyeIcon : EyeOffIcon} />
                        </InputSlot>
                        </Input>
                    </>
                )}

                <Button
                    disabled={loading}
                    onPress={handleVerifyOTP}
                    size="lg"
                    style={styles.continueButton}
                >
                    <ButtonText>{type === "reset" ? "Restablecer contraseña" : "Verificar"}</ButtonText>
                </Button>

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

            </VStack>
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
  },
  inputField: {
    // optional
  },
  continueButton: {
    borderRadius: 25,
    marginTop: 16,
    backgroundColor: '#F97316',
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
    color: "#F97316", // Using primary color
    fontSize: 16,
    fontWeight: 'bold',
  },
});
