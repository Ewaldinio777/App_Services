import { useEffect, useState } from "react";
import { View, Text, Button, TextInput, ScrollView, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";

const Tools: React.FC = () => {
  const { session, logout } = useAuth();

  // Fallback if session isn't set
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
        <Text>Pantalla Tools</Text>
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

export default Tools;
