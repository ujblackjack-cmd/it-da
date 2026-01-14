export interface FollowUser {
    userId: number;
    username: string;
    email: string;
    isFollowing: boolean;
}

export interface FollowStatusResponse {
    isFollowing: boolean;
}

export interface FollowCountResponse {
    followingCount: number;
    followerCount: number;
}