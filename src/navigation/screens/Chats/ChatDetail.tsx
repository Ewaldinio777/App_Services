import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  Alert
} from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Message, Profile } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";

type ChatDetailRouteProp = RouteProp<RootStackParamList, "ChatDetail">;

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// CORRECCIÓN PRINCIPAL: Usamos la misma lógica robusta que en Chats.tsx
const formatMessageTime = (utcTimeString: string) => {
  if (!utcTimeString) return "";
  try {
    const date = new Date(utcTimeString);
    const now = new Date();
    
    if (isNaN(date.getTime())) return "";

    // Obtenemos explícitamente la zona horaria del dispositivo
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const timeStr = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone, // Forzamos la zona horaria del dispositivo
      hour12: true,
    });

    const isSameDay = (d1: Date, d2: Date) => 
      d1.getDate() === d2.getDate() && 
      d1.getMonth() === d2.getMonth() && 
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(date, now)) {
      return timeStr;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    if (isSameDay(date, yesterday)) {
      return `Ayer ${timeStr}`;
    }
    
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `${days[date.getDay()]} ${timeStr}`;
    }

    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${timeStr}`;
  } catch (error) {
    return "";
  }
};

const MessageItem = React.memo(({ message, currentUserId }: { message: Message, currentUserId: string }) => {
  const isMine = message.sender_id === currentUserId;
  const isTemp = message.id.startsWith('temp-') || (message as any).pending; // Check for pending flag
  const hasError = (message as any).error;

  return (
    <View
      style={[
        styles.messageBubble, 
        isMine ? styles.myMessage : styles.otherMessage,
        isTemp && styles.sendingMessage,
        hasError && styles.errorMessage,
      ]}
    >
      <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
        {message.content}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
          {formatMessageTime(message.created_at)}
        </Text>
        {isMine && !isTemp && (
          <Ionicons 
            name={message.is_read ? "checkmark-done-outline" : "checkmark-outline"} 
            size={14} 
            color="#fff" 
            style={{ marginLeft: 4, marginTop: 2, opacity: 0.8 }}
          />
        )}
      </View>
    </View>
  );
});

const ChatDetail: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chatId, otherParticipantId } = route.params;

  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null);

  // New State for Profile/Schedule features
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [otherProvider, setOtherProvider] = useState<any>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState(false);

  useEffect(() => {
    if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => setMyProfile(data));
    }
  }, [session]);

  const loadProviderData = async (profileId: string) => {
    try {
        setIsLoadingProvider(true);
        const { data, error } = await supabase
            .from('providers')
            .select('*')
            .eq('id', profileId)
            .single();
        
        if (error) {
            console.error("Error loading provider details:", error);
            // Si no se encuentra, tal vez no es un proveedor valido aunque is_provider sea true
        }
        if (data) {
            setOtherProvider(data);
        }
    } catch (e) {
        console.error("Exception loading provider:", e);
    } finally {
        setIsLoadingProvider(false);
    }
  };

  useEffect(() => {
    if (otherParticipant?.is_provider && otherParticipant?.id) {
        loadProviderData(otherParticipant.id);
    }
  }, [otherParticipant]);

  // Listen to keyboard events for Android - REMOVED to fix double spacing with adjustResize
  /* 
     With windowSoftInputMode="adjustResize" in AndroidManifest.xml, the view automatically resizes properly.
     We don't need manual padding which causes the input to jump up too high.
  */


  const mergeMessages = (incoming: Message[]) => {
    setMessages((prev) => {
      const allMessages = [...incoming, ...prev];
      const uniqueMessages = Array.from(new Map(allMessages.map(msg => [msg.id, msg])).values());
      
      return uniqueMessages.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });
    });
  };

  useEffect(() => {
    if (!session?.user) return;

    loadOtherParticipant();

    if (currentChatId) {
      loadMessages();
      
      const subscription = supabase
        .channel(`chat_detail:${currentChatId}`)
        .on(
          "postgres_changes",
          { 
            event: "INSERT", 
            schema: "public", 
            table: "messages", 
            filter: `chat_id=eq.${currentChatId}` 
          },
          async (payload) => {
            const newMessage = payload.new as Message;
            // Si el mensaje viene de la otra persona, márcalo como leído inmediatamente
            if (newMessage.sender_id !== session.user.id) {
               await supabase
                   .from('messages')
                   .update({ is_read: true })
                   .eq('id', newMessage.id);
               
               // Asumimos localmente que ya está leído para mostrarlo en UI
               newMessage.is_read = true; 
               mergeMessages([newMessage]);
            } else {
               // Si es mi mensaje, puede que venga de otro dispositivo mio, o es el eco del INSERT
               // Si es el eco, ya lo tenemos (posiblemente) via optimista, pero mergeMessages lo maneja con ID
               mergeMessages([newMessage]);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `chat_id=eq.${currentChatId}`
          },
          (payload) => {
            const updatedMessage = payload.new as Message;
            setMessages(prev =>
              prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else {
      setLoading(false);
    }
  }, [currentChatId, session?.user]);

  const loadMessages = async () => {
    if (!currentChatId || !session?.user) return;

    try {
      // Marcar mensajes no leídos como leídos si no son míos
      // Esto solo lo hacemos una vez al cargar mensajes, o si queremos, podemos hacerlo en un efecto separado
      // que busque mensajes no leídos donde yo no soy el sender.
      // Lo hacemos antes de cargar para que al cargar ya vengan actualizados, o hacemos el update y luego en local state
      
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', currentChatId)
        .neq('sender_id', session.user.id) // Mensajes que NO envié yo
        .eq('is_read', false); 

      // Ahora cargamos los mensajes
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", currentChatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setMessages(prev => {
        const incoming = data || [];
        const messageMap = new Map(incoming.map(m => [m.id, m]));
        
        prev.forEach(msg => {
          if (msg.id.startsWith('temp-')) {
            messageMap.set(msg.id, msg);
          }
        });

        return Array.from(messageMap.values()).sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        });
      });
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOtherParticipant = async () => {
    try {
      if (otherParticipantId) {
        const { data } = await supabase.from("profiles").select("*").eq("id", otherParticipantId).single();
        setOtherParticipant(data || null);
        return;
      }

      if (currentChatId) {
        const { data: chatData } = await supabase.from("chats").select("participant_1_id, participant_2_id").eq("id", currentChatId).single();
        
        const otherId = chatData?.participant_1_id === session?.user?.id ? chatData?.participant_2_id : chatData?.participant_1_id;
        if (!otherId) return;

        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", otherId).single();
        setOtherParticipant(profileData || null);
      }
    } catch (error) {
      console.error("Error loading participant:", error);
    }
  };

  const handleSend = async () => {
    if (!session?.user) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    let targetChatId = currentChatId;

    if (!targetChatId) {
      try {
         if (!otherParticipantId) {
             console.error("No participant to chat with");
             return;
         }

        const { data: existingChats } = await supabase
          .from("chats")
          .select("id")
          .or(
             `and(participant_1_id.eq.${session.user.id},participant_2_id.eq.${otherParticipantId}),and(participant_1_id.eq.${otherParticipantId},participant_2_id.eq.${session.user.id})`
          )
          .limit(1);
        
        if (existingChats && existingChats.length > 0) {
            targetChatId = existingChats[0].id;
        } else {
             const { data: newChat, error: createError } = await supabase
              .from("chats")
              .insert({
                participant_1_id: session.user.id,
                participant_2_id: otherParticipantId,
              })
              .select("id")
              .single();

            if (createError) throw createError;
            targetChatId = newChat.id;
        }
        setCurrentChatId(targetChatId);
      } catch (error) {
        console.error("Error creating chat:", error);
        return;
      }
    }

    const messageId = generateUUID();
    const now = new Date();
    // Guardamos en UTC (estándar ISO)
    const isoString = now.toISOString(); 
    
    const tempMessage: Message = {
      id: messageId,
      chat_id: targetChatId!,
      sender_id: session.user.id,
      content: trimmed,
      created_at: isoString, 
      is_read: false,
    };
    // Mark as pending locally so UI can show it as "sending"
    (tempMessage as any).pending = true;

    setMessages(prev => [tempMessage, ...prev]);
    setMessageText("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          id: messageId, // Use generated UUID
          chat_id: targetChatId!,
          sender_id: session.user.id,
          content: trimmed,
          created_at: isoString, 
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        // Update the message with server data (e.g. if timestamps differ slightly) and remove pending flag
        setMessages(prev => 
          prev.map(msg => msg.id === messageId ? data : msg)
        );

        // --- NOTIFICATION LOGIC ---
        // Notify the recipient
        if (otherParticipant?.id) {
           const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
           const myName = myProfile?.full_name || "Un usuario";

           // 1. Check for recent unread notification from this chat
           const { data: recentNotif } = await supabase
               .from('notifications')
               .select('*')
               .eq('user_id', otherParticipant.id)
               .eq('type', 'chat')
               .eq('related_id', targetChatId!) 
               .eq('is_read', false)
               .order('created_at', { ascending: false })
               .limit(1)
               .single();

           let shouldUpdate = false;
           let newCount = 1;

           if (recentNotif) {
                const lastTime = new Date(recentNotif.created_at).getTime();
                const diffHours = (new Date().getTime() - lastTime) / (1000 * 60 * 60);

                if (diffHours < 1) {
                    shouldUpdate = true;
                    // Extract count
                    const match = recentNotif.body.match(/Tienes (\d+) nuevos mensajes/);
                    if (match) {
                        newCount = parseInt(match[1]) + 1;
                    } else if (recentNotif.body.includes("Tienes un nuevo mensaje")) {
                        newCount = 2;
                    } else {
                        // If checking body fails, default to +1 assuming it was at least 1? 
                        // Or just start counting? Let's assume 2 to be safe or parse carefully.
                        // Actually if body format changed, fallback to "Tienes 2..."
                        newCount = 2;
                    }
                }
           }

           if (shouldUpdate && recentNotif) {
               await supabase
                   .from('notifications')
                   .update({
                       body: `Tienes ${newCount} nuevos mensajes de ${myName}.`,
                       created_at: new Date().toISOString() // Refresh time
                   })
                   .eq('id', recentNotif.id);
           } else {
               await supabase.from('notifications').insert({
                  user_id: otherParticipant.id,
                  title: "Nuevo Mensaje",
                  body: `Tienes un nuevo mensaje de ${myName}.`,
                  type: 'chat',
                  related_id: targetChatId!,
                  is_read: false
               });
           }
        }
        // --------------------------
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, error: true } : msg));
    }
  };

  if (!session?.user) return <View style={styles.centerContainer}><Text>Error: Sesión no disponible.</Text></View>;

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 100}
      >
        <View style={styles.header}>
            
        <View style={styles.headerUserInfo}>
            {otherParticipant?.avatar_url ? (
              <Image 
                source={{ uri: otherParticipant.avatar_url }} 
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0' }} 
              />
            ) : (
              <Ionicons name="person-circle" size={40} color="#F97316" />
            )}
            <View style={{ marginLeft: 10, flex: 1, marginRight: 8 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>{otherParticipant?.full_name || "Chat"}</Text>
            </View>
        </View>

            <View style={styles.headerActions}>
                {otherParticipant?.is_provider && (
                    <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.profileButton}>
                        <Text style={styles.profileButtonText}>Perfil</Text>
                    </TouchableOpacity>
                )}
                
                {/* Agendar button: Visible only if the other participant is a provider */}
                {otherParticipant?.is_provider && (
                  <TouchableOpacity 
                      onPress={() => {
                          if (otherProvider) {
                              navigation.navigate('ScheduleService', { providerId: otherProvider.id });
                          } else if (otherParticipant?.is_provider) {
                               Alert.alert("Aviso", "Cargando información...");
                               if (otherParticipant?.id) loadProviderData(otherParticipant.id);
                          }
                      }} 
                      style={styles.callButton}
                  >
                      <Text style={styles.callButtonText}>Agendar</Text>
                  </TouchableOpacity>
                )}
            </View>
        </View>

        <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.centerContainer}><ActivityIndicator size="large" color="#F97316" /></View>
            ) : (
              <FlatList
                style={styles.messagesContainer}
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => ( // Date separators logic would go here ideally 
                   <MessageItem message={item} currentUserId={session?.user?.id || ''} />
                )}
              />
            )}

            {/* Input Area - Cleaned up (No attach/mic) */}
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              
              <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor="#9CA3AF"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                  />
              </View>
              
              <TouchableOpacity 
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} 
                onPress={handleSend}
                disabled={!messageText.trim()}
              >
                <Ionicons name="paper-plane" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAvoidingView>
    {/* Profile Modal kept as is */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                {/* Close Button */}
                <TouchableOpacity 
                    style={{ position: 'absolute', top: 15, right: 15, zIndex: 1 }}
                    onPress={() => setShowProfileModal(false)}
                >
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>

                {otherParticipant && (
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 30 }}>
                        {/* Header Profile Info */}
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            {otherParticipant.avatar_url ? (
                                <Image source={{ uri: otherParticipant.avatar_url }} style={styles.modalAvatar} />
                            ) : (
                                <View style={[styles.modalAvatar, { backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="person" size={50} color="#fff" />
                                </View>
                            )}
                            
                            <Text style={styles.modalName}>{otherParticipant.full_name}</Text>
                            
                            {otherProvider && (
                                <>
                                    <Text style={styles.modalSpecialization}>
                                        {Array.isArray(otherProvider.specialization) 
                                            ? otherProvider.specialization.join(", ") 
                                            : otherProvider.specialization || "Proveedor"}
                                    </Text>
                                    
                                    <View style={styles.modalRatingContainer}>
                                        <Ionicons name="star" size={18} color="#FFD700" />
                                        <Text style={styles.modalRatingText}>
                                            {otherProvider.rating ? otherProvider.rating.toFixed(1) : "0.0"} 
                                            <Text style={{ color: '#666', fontWeight: 'normal' }}> ({otherProvider.total_reviews || 0})</Text>
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {otherProvider ? (
                            <View style={{ width: '100%' }}>
                                {/* Divider */}
                                <View style={styles.divider} />

                                {/* Contact Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Información de Contacto</Text>
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="call" size={20} color="#F97316" />
                                        <Text style={styles.infoText}>{otherParticipant.phone || "No disponible"}</Text>
                                    </View>
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location" size={20} color="#F97316" />
                                        <Text style={styles.infoText}>{otherParticipant.state || "Ubicación no disponible"}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Ionicons name="card" size={20} color="#F97316" />
                                        <Text style={styles.infoText}>{otherProvider.id_number || "V-00000000"}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                             <View style={{ marginTop: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#F97316" />
                                <Text style={{ marginTop: 10, color: '#666' }}>
                                    {isLoadingProvider ? "Cargando perfil..." : "Información no disponible."}
                                </Text>
                             </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  callButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#F97316', // Orange
    borderBottomRightRadius: 2,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6', // Light Gray
    borderBottomLeftRadius: 2,
  },
  sendingMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10,
    textAlign: 'right',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  iconButton: {
    padding: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24, // Pill
    marginHorizontal: 8,
    paddingHorizontal: 12,
    height: 44, // Fixed height for alignment
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 8, // Ensure centered text
    maxHeight: 100,
  },
  iconButtonSmall: {
    padding: 4,
  },
  sendButton: {
    backgroundColor: '#F97316',
    width: 44,
    height: 44,
    borderRadius: 14, // Rounded square
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  // Modal Styles
  headerActionButton: {},
  headerActionText: {},
  // Modal...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSpecialization: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalRatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 0,
  },
  modalRatingText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginLeft: 6,
  },
  divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      width: '100%',
      marginVertical: 16,
  },
  modalSection: {
      marginBottom: 5,
  },
  modalSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 10,
  },
  modalText: {
      fontSize: 15,
      color: '#555',
      lineHeight: 22,
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
  },
  infoText: {
      fontSize: 15,
      color: '#555',
      marginLeft: 12,
      fontWeight: '500', 
  },
  // Removed unused styles to keep it clean, but if needed I can leave them or update them
  modalLabel: {
    display: 'none',
  },
});

export default ChatDetail;
