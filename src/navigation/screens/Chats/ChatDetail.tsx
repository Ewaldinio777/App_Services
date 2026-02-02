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
  Keyboard,
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
  const isTemp = message.id.startsWith('temp-');
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // Listen to keyboard events for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

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

    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    // Guardamos en UTC (estándar ISO)
    const isoString = now.toISOString(); 
    
    const tempMessage: Message = {
      id: tempId,
      chat_id: targetChatId!,
      sender_id: session.user.id,
      content: trimmed,
      created_at: isoString, 
      is_read: false,
    };

    setMessages(prev => [tempMessage, ...prev]);
    setMessageText("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: targetChatId!,
          sender_id: session.user.id,
          content: trimmed,
          created_at: isoString, // Enviamos explícitamente el created_at que coincide con el optimista
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? data : msg)
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
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, error: true } : msg));
    }
  };

  if (!session?.user) return <View style={styles.centerContainer}><Text>Error: Sesión no disponible.</Text></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.contentContainer, { paddingBottom: keyboardHeight }]}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="person-circle" size={28} color="#007AFF" />
                  <Text style={styles.headerTitle} numberOfLines={1}>{otherParticipant?.full_name || "Chat"}</Text>
              </View>

              {otherParticipant?.is_provider && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.headerActionButton}>
                        <Text style={styles.headerActionText}>Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            if (otherProvider) {
                                navigation.navigate('ScheduleService', { providerId: otherProvider.id });
                            } else {
                                if (isLoadingProvider) {
                                    Alert.alert("Aviso", "Cargando información...");
                                } else if (otherParticipant?.id) {
                                    Alert.alert("Aviso", "Reintentando cargar información del proveedor...", [], { cancelable: true });
                                    loadProviderData(otherParticipant.id).then(() => {
                                         // Check in state won't work immediately here due to closures, but user can click again
                                         // Or we can navigate if data is found inside loadProviderData? No, simpler to let user click again or check here.
                                         // To be safe, just feedback to user.
                                    });
                                } else {
                                     Alert.alert("Error", "No se pudo cargar la información del proveedor.");
                                }
                            }
                        }} 
                        style={[styles.headerActionButton, { backgroundColor: '#000' }]}
                    >
                        <Text style={[styles.headerActionText, { color: '#fff' }]}>Agendar</Text>
                    </TouchableOpacity>
                </View>
              )}
            </View>

            {loading ? (
              <View style={styles.centerContainer}><ActivityIndicator size="large" color="#007AFF" /></View>
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
                renderItem={({ item }) => (
                  <MessageItem message={item} currentUserId={session?.user?.id || ''} />
                )}
              />
            )}

            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un mensaje"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} 
                onPress={handleSend}
                disabled={!messageText.trim()}
              >
                <Ionicons name="send" size={20} color={messageText.trim() ? "#fff" : "#aaa"} />
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Información del Proveedor</Text>
                    <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                {otherParticipant && (
                    <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20 }}>
                        {otherParticipant.avatar_url ? (
                            <Image source={{ uri: otherParticipant.avatar_url }} style={styles.modalAvatar} />
                        ) : (
                            <View style={[styles.modalAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="person" size={40} color="#999" />
                            </View>
                        )}
                        <Text style={styles.modalName}>{otherParticipant.full_name}</Text>
                        
                        {otherProvider ? (
                            <View style={{ width: '100%', marginTop: 20 }}>
                                <Text style={styles.modalLabel}>Especialización</Text>
                                <Text style={styles.modalText}>{otherProvider.specialization}</Text>
                                
                                <Text style={styles.modalLabel}>Descripción</Text>
                                <Text style={styles.modalText}>{otherProvider.description}</Text>

                                <Text style={styles.modalLabel}>Teléfono</Text>
                                <Text style={styles.modalText}>{otherProvider.phone}</Text>
                            </View>
                        ) : (
                             <View style={{ marginTop: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#0000ff" />
                                <Text style={{ marginTop: 10, color: '#666' }}>
                                    {isLoadingProvider ? "Cargando detalles..." : "No se pudo cargar la información del proveedor."}
                                </Text>
                             </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  container: { 
    flex: 1
  },
  contentContainer: {
    flex: 1
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    padding: 16, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#e0e0e0" 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "600" 
  },
  messagesContainer: { 
    flex: 1, 
    paddingHorizontal: 16 
  },
  scrollContent: {
    paddingVertical: 12,
    paddingTop: 20,
  },
  messageBubble: { 
    maxWidth: "80%", 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  myMessage: { 
    alignSelf: "flex-end", 
    backgroundColor: "#007AFF" 
  },
  otherMessage: { 
    alignSelf: "flex-start", 
    backgroundColor: "#e9e9eb" 
  },
  sendingMessage: { 
    opacity: 0.7 
  },
  errorMessage: { 
    backgroundColor: '#ffebee', 
    borderColor: '#f44336', 
    borderWidth: 1 
  },
  messageText: { 
    color: "#111" 
  },
  myMessageText: { 
    color: "#fff" 
  },
  otherMessageText: { 
    color: "#111" 
  },
  messageTime: { 
    marginTop: 4, 
    fontSize: 10, 
    textAlign: "right" 
  },
  myMessageTime: { 
    color: "#e6e6e6" 
  },
  otherMessageTime: { 
    color: "#666" 
  },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 10, 
    paddingBottom: Platform.OS === 'android' ? 20 : 10,
    borderTopWidth: 1, 
    borderTopColor: "#e0e0e0", 
    backgroundColor: "#fff",
    minHeight: 70
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 20, 
    paddingHorizontal: 14, 
    paddingVertical: 8,
    paddingTop: 8,
    maxHeight: 100,
    marginRight: 10, 
    backgroundColor: "#fff" 
  },
  sendButton: { 
    backgroundColor: "#007AFF", 
    width: 44,
    height: 44,
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  sendButtonDisabled: {
    backgroundColor: "#e0e0e0"
  },
  headerActionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  modalName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
    marginTop: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  }
});

export default ChatDetail;