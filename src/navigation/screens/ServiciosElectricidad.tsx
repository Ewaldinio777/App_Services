import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Button, ButtonText } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { useNavigation } from "@react-navigation/native";
import { Card } from "@/src/components/ui/card";
import { Heading } from "@/src/components/ui/heading";
import { Avatar, AvatarImage, AvatarFallbackText } from "@/src/components/ui/avatar";
import { HStack } from "@/src/components/ui/hstack";

const ServiciosElectricidad: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation();

  // Datos simulados (puedes reemplazarlos por props o datos de tu API)
  const serviceData = {
    userName: "Eduardo Barrios",
    userImage: "https://static.wikia.nocookie.net/doblaje/images/6/60/MadisonBeerBIO.webp/revision/latest?cb=20241221092426&path-prefix=es",
    serviceTitle: "Instalación y Mantenimiento Eléctrico",
    serviceDescription: "Ofrezco servicios profesionales de cableado residencial, reparación de cortocircuitos e instalación de luminarias. Disponible 24/7 para emergencias.",
  };

  // Fallback si no hay sesión
  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={styles.headerContainer}>
        <Heading size="lg">Servicios Disponibles</Heading>
      </View>

      {/* --- INICIO DE LA CARTA DE SERVICIO --- */}
      <Card size="md" variant="elevated" style={styles.cardContainer}>
        
        {/* 1. Cabecera: Foto y Nombre */}
        <HStack space="md" style={styles.cardHeader}>
          <Avatar size="md">
            <AvatarFallbackText>{serviceData.userName}</AvatarFallbackText>
            <AvatarImage
              source={{ uri: serviceData.userImage }}
              alt={`Foto de ${serviceData.userName}`}
            />
          </Avatar>
          <View style={styles.userInfo}>
            <Heading size="sm">{serviceData.userName}</Heading>
            <Text size="xs" style={{ color: "gray" }}>Profesional Verificado</Text>
          </View>
        </HStack>

        {/* 2. Cuerpo: Título y Descripción del Servicio */}
        <View style={styles.cardBody}>
          <Heading size="md" style={styles.serviceTitle}>
            {serviceData.serviceTitle}
          </Heading>
          <Text size="sm" style={styles.serviceDescription}>
            {serviceData.serviceDescription}
          </Text>
        </View>

        {/* 3. Pie: Botón de Acción */}
        <Button
          size="md"
          variant="solid"
          action="primary"
          onPress={() => console.log("Contactando al usuario...")}
          style={styles.contactButton}
        >
          <ButtonText>¡Contactar ahora!</ButtonText>
        </Button>

      </Card>
      {/* --- FIN DE LA CARTA DE SERVICIO --- */}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: 10,
  },
  cardContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    // Sombra suave para resaltar la carta
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    alignItems: "center", // Alinea verticalmente el avatar con el texto
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 12,
  },
  userInfo: {
    justifyContent: "center",
    marginLeft: 10,
  },
  cardBody: {
    marginBottom: 20,
  },
  serviceTitle: {
    marginBottom: 8,
    color: "#333",
  },
  serviceDescription: {
    lineHeight: 20,
    color: "#555",
  },
  contactButton: {
    width: "100%",
    borderRadius: 8,
  },
});

export default ServiciosElectricidad;