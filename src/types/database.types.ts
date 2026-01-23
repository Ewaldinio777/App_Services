// Database types for Supabase tables
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_provider: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Provider {
  id: string;
  profile_id: string;
  id_number: string; // cedula/RIF
  specialization: string;
  description: string;
  experience: string;
  phone: string;
  rating?: number;
  reviews_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  client_id: string;
  provider_id: string;
  service_id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  total_price?: number;
  created_at: string;
  updated_at?: string;
}

export interface Chat {
  id: string;
  order_id?: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  provider_id: string;
  client_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'message' | 'review' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  action_type?: 'navigate_order' | 'navigate_chat' | 'navigate_service';
  action_data?: any;
  created_at: string;
}
