import React, { useState } from "react";
import { Alert, StyleSheet, View, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase-client";
import { translateError } from "../../../lib/error-translator";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField, InputSlot, InputIcon } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { VStack } from "../../../components/ui/vstack";
import { useNavigation } from "@react-navigation/native";
import type { AuthStackParamList } from "../../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { EyeIcon, EyeOffIcon } from "../../../components/ui/icon";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleState = () => {
    setShowPassword((showState) => {
      return !showState
    })
  }

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert("Error", translateError(error.message));
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../../assets/LOGO.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <VStack space="md" style={styles.formContainer}>
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
              
              <Input
                variant="outline"
                size="lg"
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}
                style={styles.inputWrapper}
              >
                <InputField
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  placeholder="Contraseña"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.inputField}
                />
                <InputSlot onPress={handleState} style={{ paddingRight: 10 }}>
                  <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                </InputSlot>
              </Input>

              <Button 
                disabled={loading} 
                onPress={() => signInWithEmail()}
                size="lg"
                style={styles.loginButton}
              >
                <ButtonText>Iniciar sesión</ButtonText>
              </Button>

              <TouchableOpacity onPress={() => navigation.navigate("ResetPassword")} style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPassword}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </VStack>
          </View>

          <View style={styles.footerContainer}>
            <Button
              disabled={loading}
              onPress={() => navigation.navigate("Register")}
              variant="outline"
              size="lg"
              action="primary"
              style={styles.createAccountButton}
            >
              <ButtonText>Crear cuenta nueva</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    borderRadius: 8,
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  inputField: {
    // optional
  },
  loginButton: {
    borderRadius: 25,
    marginTop: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPassword: {
    textAlign: 'center',
    color: "#F97316",
    fontWeight: "bold",
  },
  footerContainer: {
    width: '100%',
  },
  createAccountButton: {
    width: '100%',
    borderRadius: 25,
  }
});
