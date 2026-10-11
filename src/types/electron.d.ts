export {}

declare global {
    interface Window {
        ipcRenderer: {
            invoke(
                channel: "select-model-file"
            ): Promise<string | null>
        }
    }
}