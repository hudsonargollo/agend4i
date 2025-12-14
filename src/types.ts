export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category: string;
  imageUrl?: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  threshold: number;
  rewardDescription: string;
}

export interface Professional {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
}

export interface Provider {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  location: string;
  services: Service[];
  professionals: Professional[];
  loyaltyProgram?: LoyaltyConfig;
  policies?: string[];
}

export interface TimeSlot {
  id: string;
  time: string; // "14:00"
  available: boolean;
}

export interface CartItem extends Service {}

export enum AppMode {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Booking {
  id: string;
  professionalId: string;
  serviceName: string;
  price: number;
  date: string; // ISO date or "Mon", "Tue" for mock
  timestamp: number;
}
