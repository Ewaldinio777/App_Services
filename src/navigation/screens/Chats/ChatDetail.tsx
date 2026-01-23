import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Message, Profile } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRoute, RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../types";

type ChatDetailRouteProp = RouteProp<RootStackParamList, "ChatDetail">;

const ChatDetail: React.FC = () => {
  const { session } = useAuth();
  const route = useRoute<ChatDetailRouteProp>();
  const { chatId, otherParticipantId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session?.user) return;

    loadMessages();
    loadOtherParticipant();

    const subscription = supabase
      .channel(`messages_${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, session?.user]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const loadOtherParticipant = async () => {
    try {
      if (otherParticipantId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherParticipantId)
          .single();

        if (error) throw error;
        setOtherParticipant(data || null);
        return;
      }

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("participant_1_id, participant_2_id")
        .eq("id", chatId)
        .single();

      if (chatError) throw chatError;

      const otherId =
        chatData?.participant_1_id === session?.user?.id
          ? chatData?.participant_2_id
          : chatData?.participant_1_id;

      if (!otherId) return;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();

      if (profileError) throw profileError;
      setOtherParticipant(profileData || null);
    } catch (error) {
      console.error("Error loading participant:", error);
    }
  };

  const handleSend = async () => {
    if (!session?.user) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: session.user.id,
        content: trimmed,
      });

      if (error) throw error;
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!session?.user) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <Ionicons name="person-circle" size={28} color="#007AFF" />
        <Text style={styles.headerTitle}>
          {otherParticipant?.full_name || "Chat"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView
          style={styles.messagesContainer}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => {
            const isMine = message.sender_id === session.user.id;
            return (
              <View
                key={message.id}
                style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}
              >
                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
                  {message.content}
                </Text>
                <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
                  {new Date(message.created_at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje"
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#e9e9eb",
  },
  messageText: {
    color: "#111",
  },
  myMessageText: {
    color: "#fff",
  },
  otherMessageText: {
    color: "#111",
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10,
    color: "#666",
    textAlign: "right",
  },
  myMessageTime: {
    color: "#e6e6e6",
  },
  otherMessageTime: {
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChatDetail;
