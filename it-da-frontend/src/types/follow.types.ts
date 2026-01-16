// src/types/follow.types.ts

export interface FollowUser {
    userId: number;
    username: string;
    email: string;
    profileImageUrl?: string;
    isFollowing: boolean;
}

export interface FollowStatusResponse {
    isFollowing: boolean;
}

export interface FollowRequestStatusResponse {
    status: 'none' | 'pending' | 'following';
}

export interface UserProfileData {
    userId: number;
    username: string;
    email: string | null;
    profileImageUrl: string | null;
    bio: string | null;
    mbti: string | null;
    address: string | null;
    interests: string | null;
    isPublic: boolean;
    followingCount: number;
    followerCount: number;
    isFollowing: boolean;
    followRequestStatus: 'none' | 'pending' | 'following';
    isMyProfile: boolean;
    canViewFullProfile: boolean;
}