export const TAG_COLOR_COUNT = 8

// Consistent color per tag name, regardless of add/remove order.
// Shared by AddModelModal (input chips) and ModelCard (display chips)
// so the same tag always renders the same color everywhere.
export function tagColorIndex(tag: string): number {
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
        hash = (hash << 5) - hash + tag.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash) % TAG_COLOR_COUNT
}