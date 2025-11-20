import { useEffect, useState } from "react";
import { View, Text, Button, TextInput, ScrollView, Alert } from "react-native";
import { supabase } from "../../lib/supabase-client";
import { Session } from "@supabase/supabase-js";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

const ManagerCrud: React.FC = () => {
  const route = useRoute();
  const { session } = route.params as {
    session: Session;
  };

  // Add logging for debugging
  console.log("Route params:", route.params);

  const { logout } = useAuth();

  // Fallback if params aren't set
  if (!session) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Session not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View
        style={{
          padding: 20,
          alignItems: "center",
          borderColor: "black",
          borderWidth: 1,
          margin: 30,
        }}
      >
        <Text>Pantalla Inicial</Text>
      </View>

      <Button
        title="Logout"
        onPress={async () => {
          try {
            console.log("Logout button pressed");
            await logout();
            console.log("Logout completed");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
          }
        }}
      />
    </ScrollView>
  );
};

export default ManagerCrud;
