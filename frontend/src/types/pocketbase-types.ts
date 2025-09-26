/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	MealHistory = "meal_history",
	MealTemplates = "meal_templates",
	UserProfiles = "user_profiles",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type MealHistoryRecord = {
	adjustments?: string
	calorie_adjustment?: number
	carb_adjustment?: number
	created?: IsoDateString
	fat_adjustment?: number
	id: string
	meal?: RecordIdString
	name?: string
	portion_multiplier?: number
	protein_adjustment?: number
	updated?: IsoDateString
	user?: RecordIdString
}

export enum MealTemplatesProcessingStatusOptions {
	"pending" = "pending",
	"processing" = "processing",
	"completed" = "completed",
	"failed" = "failed",
}
export type MealTemplatesRecord = {
	ai_description?: string
	calorie_uncertainty_percent?: number
	carbs_uncertainty_percent?: number
	created?: IsoDateString
	description?: string
	fat_uncertainty_percent?: number
	id: string
	image?: string
	name?: string
	processing_status?: MealTemplatesProcessingStatusOptions
	protein_uncertainty_percent?: number
	total_calories?: number
	total_carbs_g?: number
	total_fat_g?: number
	total_protein_g?: number
	updated?: IsoDateString
	user?: RecordIdString
}

export enum UserProfilesGenderOptions {
	"male" = "male",
	"female" = "female",
}

export enum UserProfilesActivityLevelOptions {
	"sedentary" = "sedentary",
	"light" = "light",
	"moderate" = "moderate",
	"active" = "active",
	"very active" = "very active",
}

export enum UserProfilesGoalOptions {
	"lose_weight" = "lose_weight",
	"maintain" = "maintain",
	"gain_weight" = "gain_weight",
	"gain_muscle" = "gain_muscle",
}
export type UserProfilesRecord = {
	activity_level: UserProfilesActivityLevelOptions
	age: number
	created?: IsoDateString
	display_name?: string
	gender: UserProfilesGenderOptions
	goal: UserProfilesGoalOptions
	height_cm: number
	id: string
	target_calories?: number
	target_carbs_g?: number
	target_fat_g?: number
	target_protein_g?: number
	updated?: IsoDateString
	user?: RecordIdString
	weight_kg: number
}

export type UsersRecord = {
	avatar?: string
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type MealHistoryResponse<Texpand = unknown> = Required<MealHistoryRecord> & BaseSystemFields<Texpand>
export type MealTemplatesResponse<Texpand = unknown> = Required<MealTemplatesRecord> & BaseSystemFields<Texpand>
export type UserProfilesResponse<Texpand = unknown> = Required<UserProfilesRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	meal_history: MealHistoryRecord
	meal_templates: MealTemplatesRecord
	user_profiles: UserProfilesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	meal_history: MealHistoryResponse
	meal_templates: MealTemplatesResponse
	user_profiles: UserProfilesResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'meal_history'): RecordService<MealHistoryResponse>
	collection(idOrName: 'meal_templates'): RecordService<MealTemplatesResponse>
	collection(idOrName: 'user_profiles'): RecordService<UserProfilesResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
