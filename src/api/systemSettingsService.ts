import apiClient from "./apiClient";

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export const systemSettingsService = {
  getSettings: (): Promise<SystemSetting[]> => apiClient.get("/system/settings"),
  updateSetting: (key: string, value: string): Promise<SystemSetting> =>
      apiClient.put(`/system/settings/${key}`, { value })
};
