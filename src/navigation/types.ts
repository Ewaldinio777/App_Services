export type AuthStackParamList = {
  Auth: undefined;
  Register: undefined;
  VerifyOTP: { email: string; type: string };
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Servicios: undefined;
  Chats: { chatId?: string } | undefined;
  Ordenes: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  MainTabs: {
    screen?: keyof MainTabParamList;
    params?: MainTabParamList[keyof MainTabParamList];
  } | undefined;
  ProviderDetail: { providerId: string };
  BecomeProvider: undefined;
  Notificaciones: undefined;
  ChatDetail: { chatId: string; otherParticipantId?: string };
};