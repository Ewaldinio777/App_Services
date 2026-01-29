// Database types for Supabase tables
export interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  state?: string;
  phone?: string;
  is_provider: boolean;
  created_at: string;
}

export interface Provider {
  id: string;
  id_number: string; // cedula/RIF
  specialization: string[] | null;
  description?: string;
  experience?: string;
  is_active?: boolean;
  rating?: number;
  total_reviews?: number;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  service_type: string;
  created_at: string;
}

export interface Order {
  id: string;
  client_id: string;
  provider_id: string;
  service_type: string;
  title?: string; // Added field
  description?: string;
  status: 'pendiente' | 'aceptado' | 'en_proceso' | 'completado' | 'cancelado';
  scheduled_date?: string; // timestamp
  scheduled_time?: string; // time
  location?: string;
  delivery_address?: string; // Added field based on usage
  created_at: string;
  updated_at?: string;
}

export interface Chat {
  id: string;
  order_id?: string;
  participant_1_id?: string;
  participant_2_id?: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  rating: number;
  comment?: string;
  complaint?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}
