-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  participant_1_id uuid,
  participant_2_id uuid,
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_participant_1_id_fkey FOREIGN KEY (participant_1_id) REFERENCES public.profiles(id),
  CONSTRAINT chats_participant_2_id_fkey FOREIGN KEY (participant_2_id) REFERENCES public.profiles(id),
  CONSTRAINT chats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chat_id uuid,
  sender_id uuid,
  content text,
  created_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  title text,
  body text,
  type text,
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  provider_id uuid,
  service_type text,
  description text,
  status text DEFAULT 'pendiente'::text,
  scheduled_date timestamp without time zone,
  location text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  scheduled_time time without time zone,
  delivery_address text,
  title text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  state text,
  phone text,
  is_provider boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.providers (
  id uuid NOT NULL,
  id_number text NOT NULL UNIQUE,
  specialization ARRAY,
  description text,
  experience text,
  is_active boolean DEFAULT true,
  rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  phone bigint,
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  reviewer_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  complaint text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider_id uuid,
  service_type text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
););

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_profile_id ON providers(profile_id);
CREATE INDEX IF NOT EXISTS idx_providers_specialization ON providers(specialization);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update provider rating when a review is added
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    ),
    reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_provider_rating_trigger
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating();

-- Function to update chat's last_message
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_last_message_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for providers
CREATE POLICY "Everyone can view providers" ON providers FOR SELECT USING (true);
CREATE POLICY "Users can insert own provider record" ON providers FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own provider record" ON providers FOR UPDATE USING (auth.uid() = profile_id);

-- RLS Policies for services
CREATE POLICY "Everyone can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Providers can manage their services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM providers WHERE id = services.provider_id AND profile_id = auth.uid())
);

-- RLS Policies for orders
CREATE POLICY "Users can view their orders" ON orders FOR SELECT USING (
  auth.uid() = client_id OR auth.uid() = provider_id
);
CREATE POLICY "Clients can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Participants can update orders" ON orders FOR UPDATE USING (
  auth.uid() = client_id OR auth.uid() = provider_id
);

-- RLS Policies for chats
CREATE POLICY "Users can view their chats" ON chats FOR SELECT USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);
CREATE POLICY "Users can create chats they participate in" ON chats FOR INSERT WITH CHECK (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE id = messages.chat_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
CREATE POLICY "Users can send messages in their chats" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chats 
    WHERE id = chat_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE id = messages.chat_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- RLS Policies for reviews
CREATE POLICY "Everyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews for their orders" ON reviews FOR INSERT WITH CHECK (
  auth.uid() = client_id AND
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND status = 'completed' AND client_id = auth.uid())
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_provider, created_at)
  VALUES (NEW.id, NEW.email, false, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
