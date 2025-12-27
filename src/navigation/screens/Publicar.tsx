import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { SupabaseClient } from "@supabase/supabase-js"; // AJUSTA ESTA RUTA A TU PROYECTO
import { supabase } from "@/src/lib/supabase-client";

const Publicar: React.FC = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado para el formulario de proveedor
  const [formData, setFormData] = useState({
    cedula: "",
    company_phone: "",
    bio_description: "",
    experience_text: "",
  });

  // 1. Cargar el Rol del usuario al entrar a la pantalla
  useEffect(() => {
    if (session) fetchUserRole();
  }, [session]);

  const fetchUserRole = async () => {
    try {
      if (!session?.user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setRole(data.role);
    } catch (error) {
      console.log('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejar el envío del formulario (Convertirse en Proveedor)
  const handleBecomeProvider = async () => {
    if (!session?.user) return;

    // Validaciones básicas
    if (!formData.cedula || !formData.company_phone || !formData.bio_description) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      // Paso A: Insertar datos en provider_details
      const { error: detailsError } = await supabase
        .from('provider_details')
        .insert({
          profile_id: session.user.id,
          cedula: formData.cedula,
          company_phone: formData.company_phone,
          bio_description: formData.bio_description,
          experience_text: formData.experience_text,
        });

      if (detailsError) throw detailsError;

      // Paso B: Actualizar el rol en la tabla profiles a 'provider'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'provider' })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      Alert.alert("¡Éxito!", "Ahora eres un proveedor de servicios. Ya puedes publicar.");
      
      // Actualizamos el estado local para cambiar la vista inmediatamente
      setRole('provider');

    } catch (error: any) {
      Alert.alert("Error", error.message || "Ocurrió un error al registrarte.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- RENDERIZADO ---

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // --- VISTA 1: SI ES CLIENTE (FORMULARIO) ---
  if (role === 'client') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>¡Hazte proveedor de servicio!</Text>
          <Text style={styles.subtitle}>Completa tus datos profesionales para empezar a publicar.</Text>

          <Text style={styles.label}>Cédula / RIF *</Text>
          <TextInput
            style={styles.input}
            placeholder="V-12345678"
            value={formData.cedula}
            onChangeText={(text) => setFormData({ ...formData, cedula: text })}
          />

          <Text style={styles.label}>Teléfono de contacto (Empresa/Personal) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0414-1234567"
            keyboardType="phone-pad"
            value={formData.company_phone}
            onChangeText={(text) => setFormData({ ...formData, company_phone: text })}
          />

          <Text style={styles.label}>Descripción de tu perfil *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Soy plomero con 10 años de experiencia..."
            multiline
            numberOfLines={3}
            value={formData.bio_description}
            onChangeText={(text) => setFormData({ ...formData, bio_description: text })}
          />

          <Text style={styles.label}>Experiencia Previa</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Trabajé en la empresa X..."
            multiline
            numberOfLines={3}
            value={formData.experience_text}
            onChangeText={(text) => setFormData({ ...formData, experience_text: text })}
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleBecomeProvider}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Finalizar y Convertirme en Proveedor</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // --- VISTA 2: SI YA ES PROVEEDOR (VISTA DE PUBLICAR NORMAL) ---
  return (
    <ScrollView style={styles.container}>
      <View style={styles.providerContainer}>
        <Text style={styles.title}>Panel de Publicación</Text>
        <Text style={{textAlign: 'center', marginBottom: 20}}>
          Bienvenido, Proveedor. Aquí podrás crear tus pósters de servicio.
        </Text>
        
        {/* AQUÍ IRÁ TU FORMULARIO PARA CREAR NUEVOS SERVICIOS (POSTERS) EN EL FUTURO */}
        <View style={styles.placeholderBox}>
            <Text>Formulario para crear nuevo servicio (Próximamente)</Text>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    padding: 20,
  },
  providerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF', // Color azul de ejemplo
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  placeholderBox: {
      padding: 40,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#aaa',
      borderRadius: 10,
      width: '100%',
      alignItems: 'center'
  }
});

export default Publicar;