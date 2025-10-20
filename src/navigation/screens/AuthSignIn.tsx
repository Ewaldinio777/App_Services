import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase-client";
import { Button, ButtonText, ButtonIcon } from "../../components/ui/button";
import { Input, InputField } from "../../components/ui/input";
import { Text } from "../../components/ui/text";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
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
        <Text style={styles.label}>Password</Text>
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
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button disabled={loading} onPress={() => signInWithEmail()}>
          <ButtonText>Sign In</ButtonText>
        </Button>
      </View>
      <View style={styles.verticallySpaced}>
        <Button
          disabled={loading}
          onPress={() => Alert.alert("Button pressed!")}
          variant="solid"
          size="md"
          action="primary"
        >
          <ButtonText>Click me</ButtonText>
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
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
});
