import { View, ScrollView, Pressable } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Center } from "@/src/components/ui/center";
import { Button, ButtonText } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { StyleSheet } from "react-native";
import { Fab, FabIcon, FabLabel } from "@/src/components/ui/fab";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../types";

const Servicios: React.FC = () => {
  const { session, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  

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
        <Fab
        size="sm"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
      >
        <FabIcon as={Ionicons} name="notifications-sharp" size={20} />
        </Fab>
      </View>

<Center style={styles.centerStyle}>

  <Fab
        onPress={() => navigation.navigate("ServiciosPlomeria")}
        size="sm"
        placement="top center"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
      >
        <FabIcon as={Ionicons} name="water-sharp" size={20} />
        <FabLabel>Plomeria</FabLabel>
      </Fab>
</Center>

        <Center style={styles.centerStyle}>

<Fab
        onPress={() => navigation.navigate("ServiciosElectricidad")}
        placement="top center"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
      >
        <FabIcon as={Ionicons} name="flash-sharp" size={20} />
        <FabLabel>Electricista</FabLabel>
      </Fab>
</Center>

    <Center style={styles.centerStyle}>

      <Fab
        onPress={() => navigation.navigate("ServiciosLimpieza")}
        size="sm"
        placement="top center"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
      >
        <FabIcon as={Ionicons} name="sparkles-sharp" size={20} />
        <FabLabel>Limpieza</FabLabel>
      </Fab>
      </Center>

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

export default Servicios;
