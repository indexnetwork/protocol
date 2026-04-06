/**
 * Storage interface for protocol layer (file uploads, avatars).
 * Implementations live in src/adapters (e.g. S3).
 */
export interface Storage {
    /**
     * Upload a buffer to storage.
     * @param buffer - The file contents
     * @param key - The storage object key (path)
     * @param contentType - The MIME type
     * @returns The URL to access the file
     */
    uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string>;
    /**
     * Upload an avatar image to storage.
     * @param buffer - The image buffer
     * @param userId - The user's ID
     * @param extension - File extension (e.g., "png", "jpg")
     * @param contentType - The MIME type
     * @returns The URL to access the avatar
     */
    uploadAvatar(buffer: Buffer, userId: string, extension: string, contentType: string): Promise<string>;
    /**
     * Upload an index (network) image to storage.
     * @param buffer - The image buffer
     * @param userId - The user's ID
     * @param extension - File extension (e.g., "png", "jpg")
     * @param contentType - The MIME type
     * @returns The URL to access the image
     */
    uploadIndexImage(buffer: Buffer, userId: string, extension: string, contentType: string): Promise<string>;
    /**
     * Upload a base64-encoded image to storage.
     * @param base64Image - The base64 string (can include data URI prefix)
     * @param folder - The folder path in the bucket (default: "feedback")
     * @returns The URL to access the image
     */
    uploadBase64Image(base64Image: string, folder?: string): Promise<string>;
    /**
     * Generate the URL for a given storage key.
     * @param key - The storage object key
     * @returns The URL to access the file
     */
    getUrl(key: string): string;
}
//# sourceMappingURL=storage.interface.d.ts.map