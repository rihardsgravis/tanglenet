interface CacheEntry {
   hash: string
   type: "data" | "html" | "asset"
   content: string
}