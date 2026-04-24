import { api } from "./client";

export type MyProfileResponse = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  codigo_institucional: string | null;
  departamento: string | null;
  telefono: string | null;
  avatar_url: string | null;
  estado: string;
  email_verificado: boolean;
  ultimo_acceso: string | null;
  roles: string[];
};

export type UpdateMyProfilePayload = {
  nombre?: string;
  apellido?: string;
  departamento?: string | null;
  telefono?: string | null;
  avatar_url?: string | null;
};

export const profileApi = {
  getMe() {
    return api.get<MyProfileResponse>("/profile/me");
  },
  updateMe(payload: UpdateMyProfilePayload) {
    return api.patch<MyProfileResponse>("/profile/me", payload);
  },
};
