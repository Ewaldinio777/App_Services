import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { supabase } from "../../../lib/supabase-client";
import { Button, ButtonText } from "../../../components/ui/button";
import { Input, InputField } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useNavigation } from "@react-navigation/native";

export default function AuthSignUp() {
  // 1. Add State for First and Last Name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
          phone: phone || null,
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
        <Text style={styles.label}>First Name</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setFirstName}
            value={firstName}
            placeholder="First Name"
            autoCapitalize="words" 
          />
        </Input>
      </View>

      {/*Last Name Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Last Name</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setLastName}
            value={lastName}
            placeholder="Last Name"
            autoCapitalize="words"
          />
        </Input>
      </View>

      {/* Phone Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Phone</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setPhone}
            value={phone}
            placeholder="Phone"
            keyboardType="phone-pad"
          />
        </Input>
      </View>

      {/* Address Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Address</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setState}
            value={state}
            placeholder="Address"
          />
        </Input>
      </View>

      {/* Email Input */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Email</Text>
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
        <Text style={styles.label}>Password</Text>
        <Input variant="outline" size="md">
          <InputField
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            placeholder="Password"
            secureTextEntry={true}
            autoCapitalize="none"
          />
        </Input>
      </View>

      <View style={styles.verticallySpaced}>
        <Button disabled={loading} onPress={() => signUpWithEmail()}>
          <ButtonText>Sign Up</ButtonText>
        </Button>
      </View>
      
      <View style={styles.verticallySpaced}>
        <Button
          onPress={() => navigation.navigate("Auth")}
          variant="solid"
          size="md"
          action="secondary"
        >
          <ButtonText>Already have an account? Sign In</ButtonText>
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
});