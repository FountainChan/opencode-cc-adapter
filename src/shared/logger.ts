export function log(message: string, data?: unknown): void {
  try {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}`
    console.log(logEntry)
  } catch {
  }
}

export function getLogFilePath(): string {
  return ""
}
