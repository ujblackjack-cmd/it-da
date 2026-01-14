import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface Notification {
  id: number;
  type: 'join' | 'message' | 'reminder' | 'system';
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  link?: string;
}

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead'>) => void;
}

const API_BASE_URL = 'http://localhost:8080/api';

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial State
      notifications: [],
      unreadCount: 0,
      isOpen: false,

      // Fetch notifications
      fetchNotifications: async () => {
        try {
          // TODO: 실제 API 연동
          const mockData: Notification[] = [
            {
              id: 1,
              type: 'join',
              title: '새로운 참여자',
              content: '"주말 등산 모임"에 김철수님이 참여했습니다',
              time: '5분 전',
              isRead: false,
              link: '/meetings/1'
            },
            {
              id: 2,
              type: 'message',
              title: '새 메시지',
              content: '"한강 선셋 피크닉" 채팅방에 3개의 새 메시지가 있습니다',
              time: '1시간 전',
              isRead: false,
              link: '/chat/2'
            },
            {
              id: 3,
              type: 'reminder',
              title: '모임 알림',
              content: '내일 오전 8시 "주말 등산 모임"이 시작됩니다',
              time: '3시간 전',
              isRead: false
            },
            {
              id: 4,
              type: 'system',
              title: '시스템 알림',
              content: 'AI가 새로운 맞춤 모임을 추천했습니다',
              time: '어제',
              isRead: true
            }
          ];

          const unreadCount = mockData.filter(n => !n.isRead).length;
          
          set({ 
            notifications: mockData,
            unreadCount 
          });
        } catch (error) {
          console.error('❌ 알림 조회 실패:', error);
        }
      },

      // Mark notification as read
      markAsRead: async (id: number) => {
        try {
          // TODO: API 호출
          // await axios.patch(`${API_BASE_URL}/notifications/${id}/read`);

          set((state) => {
            const notifications = state.notifications.map(n =>
              n.id === id ? { ...n, isRead: true } : n
            );
            const unreadCount = notifications.filter(n => !n.isRead).length;
            
            return { notifications, unreadCount };
          });
        } catch (error) {
          console.error('❌ 알림 읽음 처리 실패:', error);
        }
      },

      // Mark all as read
      markAllAsRead: async () => {
        try {
          // TODO: API 호출
          // await axios.patch(`${API_BASE_URL}/notifications/read-all`);

          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0
          }));
        } catch (error) {
          console.error('❌ 전체 읽음 처리 실패:', error);
        }
      },

      // Toggle dropdown
      toggleDropdown: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      // Close dropdown
      closeDropdown: () => {
        set({ isOpen: false });
      },

      // Add new notification (for real-time updates)
      addNotification: (notification) => {
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: Date.now(),
            isRead: false
          };
          
          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          };
        });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({ 
        notifications: state.notifications,
        unreadCount: state.unreadCount 
      }),
    }
  )
);