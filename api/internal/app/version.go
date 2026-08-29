package app

// BuildVersion is replaced with the published commit SHA when the Docker image is built.
// Development builds intentionally keep this value so they never report false updates.
var BuildVersion = "development"
