export type AuthStackParamList = {
  Auth: undefined;
  Register: undefined;
  VerifyOTP: { email: string; type: string };
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Servicios: undefined;
  Chats: undefined;
  Ordenes: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ServiciosPlomeria: { category: string };
  ServiciosElectricidad: { category: string };
  ServiciosLimpieza: { category: string };
  ProviderDetail: { providerId: string };
  BecomeProvider: undefined;
  Notificaciones: undefined;
};