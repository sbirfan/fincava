import { setAuthTokenGetter } from "@workspace/api-client-react";

export const getToken = () => localStorage.getItem("fincava_token");
export const setToken = (token: string) => localStorage.setItem("fincava_token", token);
export const clearToken = () => localStorage.removeItem("fincava_token");

// Configure the API client to automatically use the token
setAuthTokenGetter(() => {
  return getToken();
});
