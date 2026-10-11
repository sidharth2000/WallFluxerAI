export function getLocalImageUrl(filePath: string): string {
    return `wallfluxer://local-image?path=${encodeURIComponent(filePath)}`
}