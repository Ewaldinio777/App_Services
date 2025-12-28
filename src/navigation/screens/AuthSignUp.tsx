import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase-client";
import { Button, ButtonText } from "../../components/ui/button";
import { Input, InputField } from "../../components/ui/input";
import { Text } from "../../components/ui/text";
import { useNavigation } from "@react-navigation/native";

export default function AuthSignUp() {
  // 1. Add State for First and Last Name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // 2. Pass the state variables here
        data: {
          first_name: firstName, 
          last_name: lastName,
          // You can access this later via supabase.auth.user().user_metadata
        },
      },
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* 3. First Name Input */}
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

      {/* 4. Last Name Input */}
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