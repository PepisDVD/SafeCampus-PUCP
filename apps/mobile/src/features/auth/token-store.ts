import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "sc.session.token";

/** El token de sesión vive SIEMPRE en secure-store; nunca en claro ni en AsyncStorage. */
export const tokenStore = {
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
