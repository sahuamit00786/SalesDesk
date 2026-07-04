import { post } from '../../api/client';

// Contracts: server/src/controllers/authController.js
export const authApi = {
  forgotPassword: (email) => post('/auth/forgot-password', { email: email.trim().toLowerCase() }),
  resetPassword: ({ email, otp, password, confirmPassword }) =>
    post('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      password,
      confirmPassword,
    }),
};
