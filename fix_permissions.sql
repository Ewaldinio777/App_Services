-- 1. Permitir que la App cree notificaciones (IMPORTANTE)
CREATE POLICY "Users can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 2. Asegurarse que el usuario pueda verlas (Select) y marcarlas como leidas (Update)
CREATE POLICY "Users can view their notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);
