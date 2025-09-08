package utils

// Turn any value into a pointer
func ToPtr[T any](v T) *T {
	return &v
}
