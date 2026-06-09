/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	ActivityLogs: "activity_logs",
	MealHistory: "meal_history",
	MealTemplates: "meal_templates",
	UserProfiles: "user_profiles",
	Users: "users",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
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
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const ActivityLogsActivityTypeOptions = {
	"walking": "walking",
} as const
export type ActivityLogsActivityTypeOptions = typeof ActivityLogsActivityTypeOptions[keyof typeof ActivityLogsActivityTypeOptions]
export type ActivityLogsRecord = {
	activity_type: ActivityLogsActivityTypeOptions
	calories_burned?: number
	created: IsoAutoDateString
	duration_minutes?: number
	id: string
	steps?: number
	updated: IsoAutoDateString
	user: RecordIdString
}

export type MealHistoryRecord = {
	adjustments?: string
	calorie_adjustment?: number
	carb_adjustment?: number
	created: IsoAutoDateString
	fat_adjustment?: number
	id: string
	meal?: RecordIdString
	name?: string
	portion_multiplier?: number
	protein_adjustment?: number
	updated: IsoAutoDateString
	user?: RecordIdString
}

export const MealTemplatesProcessingStatusOptions = {
	"pending": "pending",
	"processing": "processing",
	"completed": "completed",
	"failed": "failed",
} as const
export type MealTemplatesProcessingStatusOptions = typeof MealTemplatesProcessingStatusOptions[keyof typeof MealTemplatesProcessingStatusOptions]
export type MealTemplatesRecord = {
	ai_description?: string
	calorie_uncertainty_percent?: number
	carbs_uncertainty_percent?: number
	context_images?: FileNameString[]
	context_notes?: string
	created: IsoAutoDateString
	description?: string
	fat_uncertainty_percent?: number
	id: string
	image?: FileNameString
	image_context?: string
	is_primary_in_group?: boolean
	linked_meal_template_id?: RecordIdString
	name?: string
	processing_status?: MealTemplatesProcessingStatusOptions
	protein_uncertainty_percent?: number
	total_calories?: number
	total_carbs_g?: number
	total_fat_g?: number
	total_protein_g?: number
	updated: IsoAutoDateString
	user?: RecordIdString
}

export const UserProfilesGenderOptions = {
	"male": "male",
	"female": "female",
} as const
export type UserProfilesGenderOptions = typeof UserProfilesGenderOptions[keyof typeof UserProfilesGenderOptions]

export const UserProfilesActivityLevelOptions = {
	"sedentary": "sedentary",
	"light": "light",
	"moderate": "moderate",
	"active": "active",
	"very active": "very active",
} as const
export type UserProfilesActivityLevelOptions = typeof UserProfilesActivityLevelOptions[keyof typeof UserProfilesActivityLevelOptions]

export const UserProfilesGoalOptions = {
	"lose_weight": "lose_weight",
	"maintain": "maintain",
	"gain_weight": "gain_weight",
	"gain_muscle": "gain_muscle",
} as const
export type UserProfilesGoalOptions = typeof UserProfilesGoalOptions[keyof typeof UserProfilesGoalOptions]
export type UserProfilesRecord = {
	activity_level: UserProfilesActivityLevelOptions
	age: number
	created: IsoAutoDateString
	display_name?: string
	gender: UserProfilesGenderOptions
	goal: UserProfilesGoalOptions
	height_cm: number
	id: string
	target_calories?: number
	target_carbs_g?: number
	target_fat_g?: number
	target_protein_g?: number
	updated: IsoAutoDateString
	user?: RecordIdString
	weight_kg: number
}

export type UsersRecord = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type ActivityLogsResponse<Texpand = unknown> = Required<ActivityLogsRecord> & BaseSystemFields<Texpand>
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
	activity_logs: ActivityLogsRecord
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
	activity_logs: ActivityLogsResponse
	meal_history: MealHistoryResponse
	meal_templates: MealTemplatesResponse
	user_profiles: UserProfilesResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
