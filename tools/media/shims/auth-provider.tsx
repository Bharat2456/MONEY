const user = { email: 'maya.rao@example.com', emailVerified: true };
export const useAuth = () => ({ user, loading: false, configured: true, logout: async () => { location.href = '/'; }, refresh: async () => {} });
export const AuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
