"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
    Send,
    Bot,
    User,
    Zap,
    Coins,
    Database,
    RefreshCcw,
    Server,
    Loader2
} from "lucide-react"
import { generateAIResponse } from "@/lib/ai-service"

// Dynamic import for @xenova/transformers (must be loaded at runtime, not build time)
// Global singleton to prevent reloading on re-renders
let embeddingPipeline: any = null
let pipelineLoading: Promise<any> | null = null

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    isCached?: boolean
    latency?: number
    costSaved?: number
}

// Cosine Similarity for Vector comparison
const cosineSimilarity = (a: number[], b: number[]) => {
    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        magnitudeA += a[i] * a[i]
        magnitudeB += b[i] * b[i]
    }
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
}

export default function FlowLLM() {
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hello! I am FlowLLM. Valid queries are cached to save you money. Try asking me something twice!" }
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [modelLoading, setModelLoading] = useState(true)

    // The "Cache" - stores { vector, response }
    const [cache, setCache] = useState<Record<string, { vector: number[], response: string }>>({})
    const [totalSaved, setTotalSaved] = useState(0)

    // Load Model on Mount
    useEffect(() => {
        const loadModel = async () => {
            if (!embeddingPipeline && !pipelineLoading) {
                try {
                    // Dynamic import to avoid SSR/Turbopack issues
                    pipelineLoading = (async () => {
                        const transformers = await import('@xenova/transformers')
                        // Force fetching from Hugging Face CDN, not local
                        transformers.env.allowLocalModels = false
                        // Use specific model, quantized for browser
                        embeddingPipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                            quantized: true,
                        })
                        return embeddingPipeline
                    })()
                    await pipelineLoading
                } catch (e) {
                    console.error("Failed to load embeddings model", e)
                    pipelineLoading = null
                }
            } else if (pipelineLoading) {
                await pipelineLoading
            }
            setModelLoading(false)
        }
        loadModel()
    }, [])

    const getEmbedding = async (text: string): Promise<number[] | null> => {
        if (!embeddingPipeline) return null
        try {
            const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true })
            return Array.from(output.data)
        } catch (e) {
            console.error(e)
            return null
        }
    }

    // Auto-scroll
    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: messages.length <= 1 ? "auto" : "smooth"
            })
        }
    }, [messages, loading])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setLoading(true)

        // Generate Embedding for current input
        const inputVector = await getEmbedding(input)

        let cachedResponse = null
        let similarityScore = 0

        // Check Cache (Cosine Similarity > 0.85)
        const threshold = 0.85

        if (inputVector) {
            for (const [key, entry] of Object.entries(cache)) {
                const score = cosineSimilarity(inputVector, entry.vector)
                if (score > threshold && score > similarityScore) {
                    similarityScore = score
                    cachedResponse = entry.response
                }
            }
        }

        if (cachedResponse) {
            // CACHE HIT
            await new Promise(r => setTimeout(r, 50)) // tiny delay for UI
            const cost = 0.002 // Mock cost per query
            setTotalSaved(prev => prev + cost)

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: cachedResponse!,
                isCached: true,
                latency: 12,
                costSaved: cost
            }])
        } else {
            // CACHE MISS - Call AI Service
            // CACHE MISS - Call AI Service
            // Prepend Question: to help the model identify the task and avoid evasive filler
            const res = await generateAIResponse(`Question: ${input}`, "You are a helpful AI assistant. Answer the user's question directly and concisely.")

            // Check for rate limiting or errors - show friendly message
            const isRateLimited = res.source === "rate-limited"
            const isError = res.source === "error"

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: isRateLimited 
                    ? "⏳ **Whoa, slow down!** You're sending requests too fast. Please wait a moment before trying again."
                    : res.text,
                isCached: false,
                latency: res.latencyMs,
                costSaved: 0
            }])

            // Update Cache with vector
            if (inputVector && !isRateLimited && !isError) {
                setCache(prev => ({
                    ...prev,
                    [input]: {
                        vector: inputVector,
                        response: res.text
                    }
                }))
            }
        }

        setLoading(false)
    }

    return (
        <div className="flex flex-col h-auto max-h-[calc(100vh-200px)] min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                        {modelLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">FlowLLM Proxy</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Semantic Caching Layer</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total Saved</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            ${totalSaved.toFixed(4)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
            >
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                        )}

                        <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div className={`p-4 rounded-2xl text-sm ${msg.role === "user"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-none"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm"
                                }`}>
                                <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-0">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {/* Metadata Badge for Assistant */}
                            {msg.role === "assistant" && (
                                <div className="flex items-center gap-2">
                                    {msg.isCached ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                            <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">CACHE HIT</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <Server className="w-3 h-3 text-slate-500" />
                                            <span className="text-[10px] font-medium text-slate-500">Live API</span>
                                        </div>
                                    )}
                                    {msg.latency !== undefined && (
                                        <span className="text-[10px] text-slate-400">{msg.latency}ms</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                                <User className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                            </div>
                        )}
                    </motion.div>
                ))}
                {loading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative flex items-center"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything (try asking the same thing twice)..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm text-slate-900 dark:text-slate-100"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || modelLoading}
                        className="absolute right-2 p-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {modelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    )
}
