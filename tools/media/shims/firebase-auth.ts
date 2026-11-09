import { navigate } from './next-navigation';
export const signInWithEmailAndPassword = async () => { navigate('/dashboard'); return {}; };
export const createUserWithEmailAndPassword = async () => ({ user: { email: 'maya.rao@example.com', emailVerified: true } });
export const sendEmailVerification = async () => {};
export const sendPasswordResetEmail = async () => {};
