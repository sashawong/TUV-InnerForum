export const MAX_UPLOAD_SIZE_MB = 5
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export const isUploadSizeAllowed = (file: { size: number }): boolean => file.size <= MAX_UPLOAD_SIZE_BYTES
