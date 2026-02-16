import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Platform } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Profile, Provider } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import * as ImagePicker from 'expo-image-picker';

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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar tu foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.log('Error selecting image:', error);
      Alert.alert('Error', error.message || 'No se pudo seleccionar la imagen');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      const fileExt = uri.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: blob.type,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      Alert.alert('Éxito', 'Foto de perfil actualizada');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Error al subir la imagen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadProfile();
    }
  }, [session]);

  // Real-time subscription for profile and provider updates
  useEffect(() => {
    if (!session?.user?.id) return;

    // Listen for changes in the profiles table (e.g. is_provider becoming true)
    const profilesSubscription = supabase
      .channel(`profile_updates:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new) {
            console.log("Profile updated:", payload.new);
            const updatedProfile = payload.new as Profile;
            setProfile(updatedProfile);
            setFullName(updatedProfile.full_name || "");
            
            // If the user just became a provider, we might need to fetch provider data
            // although the provider data might come in a separate event or query
            if (updatedProfile.is_provider) {
               // Optionally trigger a reload of everything to be safe
               loadProfile();
            }
          }
        }
      )
      .subscribe();

    // Listen for changes in the providers table
    // (UPDATES for rating/description, INSERTS for new providers)
    const providerSubscription = supabase
      .channel(`provider_updates:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'providers',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log("Provider change received:", payload);
            if (payload.new) {
                const updatedProvider = payload.new as Provider;
                setProviderData(prev => prev ? { ...prev, ...updatedProvider } : updatedProvider);
                
                // If we receive a provider update/insert but don't think we are a provider yet, refresh profile
                if (!profile?.is_provider) {
                  loadProfile();
                }
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSubscription);
      supabase.removeChannel(providerSubscription);
    };
  }, [session?.user?.id, profile?.is_provider]);

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
          <TouchableOpacity onPress={pickImage} disabled={loading}>
             {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
             ) : (
                <Ionicons name="person-circle" size={100} color="#F97316" />
             )}
             <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="#FFF" />
             </View>
          </TouchableOpacity>
        </View>
        {profile?.is_provider ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.userName}>
                {profile?.full_name || "Usuario"}
            </Text>
            {providerData?.specialization && providerData.specialization.length > 0 && (
               <Text style={{ fontSize: 16, color: '#666', marginBottom: 4 }}>
                 {providerData.specialization[0]}
               </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000', marginLeft: 4 }}>
                 {providerData?.rating ? providerData.rating.toFixed(1) : "0.0"}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>
                 /5 ({providerData?.total_reviews || 0} reseñas)
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.userName}>
            {profile?.full_name || "Usuario"}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        {profile?.is_provider ? (
            <>
                <Text style={styles.sectionTitle}>Perfil de Proveedor</Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{session.user.email}</Text>
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
        ) : (
            <>
                <Text style={styles.sectionTitle}>Información Personal</Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Nombre Completo</Text>
                  <Text style={styles.value}>{profile?.full_name || "No especificado"}</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{session.user.email}</Text>
                </View>
            </>
        )}

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
        
        {profile?.is_provider && (
        editing ? (
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
        ))}

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
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F97316',
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    lineHeight: 32, // Apply globally
    paddingVertical: 4, // Apply globally
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
    color: '#000',
  },
  fieldContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
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
