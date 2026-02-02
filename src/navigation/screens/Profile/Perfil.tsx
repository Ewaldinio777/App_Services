import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Profile, Provider } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";

const Perfil: React.FC = () => {
  const { session, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerData, setProviderData] = useState<Provider | null>(null); // Provider state
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  
  // Provider edit fields
  const [description, setDescription] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    if (session?.user) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFullName(data?.full_name || "");

      // If user is a provider, load provider details
      if (data?.is_provider) {
        const { data: provData, error: provError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (provError && provError.code !== 'PGRST116') {
             // Ignore 'not found' if it's expected, otherwise log
             console.error('Error loading provider details:', provError);
        }

        if (provData) {
            setProviderData(provData);
            setDescription(provData.description || "");
            setExperience(provData.experience || "");
        }
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!session?.user) return;

      // Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // If provider, update Provider details
      if (profile?.is_provider) {
          const { error: providerError } = await supabase
            .from('providers')
            .update({ 
                description: description,
                experience: experience
            })
            .eq('id', session.user.id);
            
          if (providerError) throw providerError;
      }

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setEditing(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    }
  };

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
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#F97316" />
        </View>
        <Text style={styles.email}>{session.user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        

        {/* Informacion de Proveedor */}
        {profile?.is_provider && (
            <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Perfil de Proveedor</Text>
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Calificación Promedio</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={styles.ratingValue}>
                      {providerData?.rating ? providerData.rating.toFixed(1) : "N/A"}
                    </Text>
                    <Text style={styles.ratingCount}>
                      ({providerData?.total_reviews || 0} reseñas)
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Descripción</Text>
                    {editing ? (
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Describe tus servicios..."
                            multiline
                            numberOfLines={4}
                        />
                    ) : (
                        <Text style={styles.value}>
                            {providerData?.description || "Sin descripción"}
                        </Text>
                    )}
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Experiencia</Text>
                    {editing ? (
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={experience}
                            onChangeText={setExperience}
                            placeholder="Cuéntanos tu experiencia laboral..."
                            multiline
                            numberOfLines={4}
                        />
                    ) : (
                        <Text style={styles.value}>
                            {providerData?.experience || "Sin experiencia especificada"}
                        </Text>
                    )}
                </View>
            </>
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Nombre Completo</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ingresa tu nombre completo"
            />
          ) : (
            <Text style={styles.value}>{profile?.full_name || "No especificado"}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session.user.email}</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Tipo de Cuenta</Text>
          <View style={styles.badgeContainer}>
            {profile?.is_provider ? (
              <View style={[styles.badge, styles.providerBadge]}>
                <Ionicons name="briefcase" size={16} color="#fff" />
                <Text style={styles.badgeText}>Proveedor</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.clientBadge]}>
                <Ionicons name="person" size={16} color="#fff" />
                <Text style={styles.badgeText}>Cliente</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        
        {editing ? (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateProfile}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                setFullName(profile?.full_name || "");
                setDescription(providerData?.description || "");
                setExperience(providerData?.experience || "");
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.buttonText}>Editar Perfil</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "No se pudo cerrar sesión");
            }
          }}
        >
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Miembro desde {new Date(profile?.created_at || '').toLocaleDateString('es-ES')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  providerBadge: {
    backgroundColor: '#F97316',
  },
  clientBadge: {
    backgroundColor: '#34C759',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#F97316',
  },
  saveButton: {
    backgroundColor: '#34C759',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#FF9500',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default Perfil;
