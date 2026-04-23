import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: async (email, password, name = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;

    if (data.session?.access_token) {
      localStorage.setItem('auth_token', data.session.access_token);
    }

    return { access_token: data.session?.access_token, user: data.user };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;

    localStorage.setItem('auth_token', data.session.access_token);
    return { access_token: data.session.access_token, user: data.user };
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('auth_token');
    return { message: 'Logged out' };
  },

  getDashboard: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export default authAPI;