if (typeof window !== "undefined") {
  // Suppress the ethereum redefinition error from browser extensions
  const originalError = console.error
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Cannot redefine property: ethereum")) {
      // Silently ignore this specific error
      return
    }
    originalError.apply(console, args)
  }
}

export {}
