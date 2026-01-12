// 백엔드 Enum 타입 정의
export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    DELETED = 'DELETED'
}

export enum ProfileVisibility {
    PUBLIC = 'PUBLIC',
    FRIENDS = 'FRIENDS',
    PRIVATE = 'PRIVATE'
}

export enum BudgetType {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    FLEXIBLE = 'FLEXIBLE'
}

export enum EnergyType {
    INTROVERT = 'INTROVERT',
    EXTROVERT = 'EXTROVERT',
    AMBIVERT = 'AMBIVERT'
}

export enum FrequencyType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    BIWEEKLY = 'BIWEEKLY',
    MONTHLY = 'MONTHLY',
    OCCASIONALLY = 'OCCASIONALLY'
}

export enum LeadershipType {
    LEADER = 'LEADER',
    PARTICIPANT = 'PARTICIPANT',
    FLEXIBLE = 'FLEXIBLE'
}

export enum LocationType {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    BOTH = 'BOTH'
}

export enum PurposeType {
    NETWORKING = 'NETWORKING',
    SKILL_DEVELOPMENT = 'SKILL_DEVELOPMENT',
    HOBBY = 'HOBBY',
    SOCIALIZING = 'SOCIALIZING',
    BUSINESS = 'BUSINESS'
}

export enum TimePreference {
    MORNING = 'MORNING',
    AFTERNOON = 'AFTERNOON',
    EVENING = 'EVENING',
    NIGHT = 'NIGHT',
    FLEXIBLE = 'FLEXIBLE'
}