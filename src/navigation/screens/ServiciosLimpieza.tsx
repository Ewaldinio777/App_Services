import { View, ScrollView } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Center } from "@/src/components/ui/center";
import { Button, ButtonText } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { StyleSheet } from "react-native";
import { Fab, FabIcon, FabLabel } from "@/src/components/ui/fab";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation } from "@react-navigation/native";


const ServiciosLimpieza: React.FC = () => {
  const { session, logout } = useAuth();
  const navigation = useNavigation();


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
          margin: 30,
        }}
      >
        <Text>Hello Limpieza</Text>
      </View>



    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerStyle: {
    gap: 10,
    marginBottom: 20,
    marginTop: 20,
  },
});

export default ServiciosLimpieza;
