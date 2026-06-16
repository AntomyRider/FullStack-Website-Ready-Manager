import { useEffect, useState } from "react"
import { useToast } from "../components/ui/toastContext"
import { getBotConfig, updateBotConfig } from "../api/botConfig"
import {
  Save,
  RotateCcw,
  Image as ImageIcon,
  Heading,
  AlignLeft,
  DollarSign,
  CreditCard,
  Phone,
  Hash,
  Bot,
  ExternalLink,
  Users
} from "lucide-react"

// Simple markdown formatter helper for preview
const formatMarkdown = (text) => {
  if (!text) return ""
  // Escape HTML tags slightly
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  
  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  // Code block ```code```
  html = html.replace(/```([\s\S]*?)```/g, "<pre class='bg-[#1e1f22] p-2 rounded text-zinc-300 text-xs border border-zinc-800 font-mono my-2 overflow-x-auto whitespace-pre-wrap'>$1</pre>")
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, "<code class='bg-[#1e1f22] px-1 py-0.5 rounded text-red-400 text-xs font-mono border border-zinc-800'>$1</code>")
  // Newlines
  html = html.replace(/\n/g, "<br />")
  
  return <div dangerouslySetInnerHTML={{ __html: html }} className="space-y-1 text-sm text-zinc-300 leading-relaxed" />
}

const BotSettings = () => {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    price1Day: 19,
    price7Days: 69,
    price30Days: 169,
    priceLifetime: 199,
    embedImageUrl: "",
    embedTitle: "READY MANAGER : โปรแกรมช่วยโพสต์",
    embedDescription: "",
    bankName: "กรุงไทย",
    bankHolder: "นครินทร์ งานยางหวาย",
    bankAccount: "4280686564",
    adminPhone: "0832584267",
    verifyChannelId: "",
    logChannelId: ""
  })

  // Load config on mount
  useEffect(() => {
    let mounted = true
    const loadConfig = async () => {
      setLoading(true)
      const res = await getBotConfig()
      if (mounted) {
        if (res.success && res.data) {
          setConfig(res.data)
        } else {
          error(res.message || "Failed to load bot configuration")
        }
        setLoading(false)
      }
    }
    loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setConfig(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await updateBotConfig(config)
    if (res.success) {
      success("Settings saved and Bot updated successfully!")
      if (res.data) setConfig(res.data)
    } else {
      error(res.message || "Failed to update configuration")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <Bot className="animate-pulse mr-2" size={20} />
        Loading Bot Configuration...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pr-5 py-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
            <Bot className="text-emerald-500" size={24} />
            Discord Bot Admin Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure prices, bank accounts, embed designs, and Discord channel integrations dynamically.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={async () => {
              const res = await getBotConfig()
              if (res.success && res.data) {
                setConfig(res.data)
                success("Settings reloaded!")
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-200 rounded-lg transition"
          >
            <RotateCcw size={14} />
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 rounded-lg transition shadow-md shadow-emerald-950/30"
          >
            {saving ? (
              <span className="flex items-center gap-1">
                <Bot className="animate-spin" size={14} /> Saving...
              </span>
            ) : (
              <>
                <Save size={14} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Side: Form Controls */}
        <div className="space-y-6 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Section 1: Embed Style */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-850 pb-2">
                1. Discord Embed Customization
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Heading size={14} className="text-zinc-500" />
                    Embed Title (หัวข้อแผงควบคุม)
                  </label>
                  <input
                    type="text"
                    name="embedTitle"
                    value={config.embedTitle || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-250 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    placeholder="READY MANAGER : โปรแกรมช่วยโพสต์"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-zinc-500" />
                    Embed Image URL (ลิงก์รูปภาพ GIF / PNG ด้านบน)
                  </label>
                  <input
                    type="text"
                    name="embedImageUrl"
                    value={config.embedImageUrl || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-250 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    placeholder="https://example.com/banner.gif"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <AlignLeft size={14} className="text-zinc-500" />
                    Embed Description (คำแนะนำ & คำเตือนหลัก)
                  </label>
                  <textarea
                    name="embedDescription"
                    value={config.embedDescription || ""}
                    onChange={handleChange}
                    rows={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    placeholder="Supports basic markdown **bold** and ```code blocks```"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Key Prices */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-850 pb-2">
                2. Key Package Pricing (ราคาคีย์ - บาท)
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                    <DollarSign size={13} className="text-zinc-500" />
                    1 Day Price
                  </label>
                  <input
                    type="number"
                    name="price1Day"
                    value={config.price1Day}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                    <DollarSign size={13} className="text-zinc-500" />
                    7 Days Price
                  </label>
                  <input
                    type="number"
                    name="price7Days"
                    value={config.price7Days}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                    <DollarSign size={13} className="text-zinc-500" />
                    30 Days Price
                  </label>
                  <input
                    type="number"
                    name="price30Days"
                    value={config.price30Days}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                    <DollarSign size={13} className="text-zinc-500" />
                    Lifetime Price
                  </label>
                  <input
                    type="number"
                    name="priceLifetime"
                    value={config.priceLifetime}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Payment Settings */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-850 pb-2">
                3. Payment Details (ช่องทางรับเงิน)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-zinc-500" />
                    Bank Name (ธนาคาร)
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={config.bankName || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="กรุงไทย"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Hash size={14} className="text-zinc-500" />
                    Bank Account Number (เลขบัญชี)
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={config.bankAccount || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="4280686564"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Users size={14} className="text-zinc-500" />
                    Account Holder Name (ชื่อบัญชี)
                  </label>
                  <input
                    type="text"
                    name="bankHolder"
                    value={config.bankHolder || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="นครินทร์ งานยางหวาย"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-zinc-500" />
                    PromptPay / Phone (เบอร์พร้อมเพย์รับโอน / ซองอั่งเปา)
                  </label>
                  <input
                    type="text"
                    name="adminPhone"
                    value={config.adminPhone || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="0832584267"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Integration Settings */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-850 pb-2">
                4. Discord Channel IDs (ห้องเชื่อมต่อบอท)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Hash size={14} className="text-zinc-500" />
                    Verify Channel ID (ห้องแผงควบคุมหลัก)
                  </label>
                  <input
                    type="text"
                    name="verifyChannelId"
                    value={config.verifyChannelId || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="1506243441007398964"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Hash size={14} className="text-zinc-500" />
                    Log Channel ID (ห้องเก็บล็อกแจ้งเตือน)
                  </label>
                  <input
                    type="text"
                    name="logChannelId"
                    value={config.logChannelId || ""}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="1512868304891412572"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Side: Live Discord Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-800/60 pb-2">
            <span>Live Discord Message Preview</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-normal">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Real-time Preview
            </span>
          </div>

          {/* Discord Wrapper (Mockup style) */}
          <div className="bg-[#313338] border border-zinc-800 rounded-xl p-5 font-sans text-zinc-200 shadow-2xl relative select-none">
            {/* Channel Header */}
            <div className="flex items-center gap-2 border-b border-[#2b2d31] pb-3 mb-4 text-zinc-400 text-xs">
              <span className="font-semibold text-zinc-500 text-sm">#</span>
              <span className="font-medium text-zinc-300">verify-and-buy</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
              <span className="text-[10px] text-zinc-500">ห้องสำหรับทำรายการคีย์</span>
            </div>

            {/* Discord Message Post */}
            <div className="flex gap-3.5 items-start">
              {/* Profile Avatar */}
              <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Bot size={22} />
              </div>
              
              {/* Message Content */}
              <div className="flex-1 space-y-2 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white text-sm hover:underline cursor-pointer">Ready Manager</span>
                  <span className="bg-[#5865F2] text-white text-[9px] px-1 py-0.5 rounded font-semibold tracking-wide flex items-center justify-center h-4 uppercase shadow-sm">BOT</span>
                  <span className="text-[#949ba4] text-[10px] ml-1">วันนี้ เวลา 22:33 น.</span>
                </div>

                {/* Discord Embed Panel */}
                <div className="border-l-[4px] border-[#57F287] bg-[#2b2d31] rounded-r-md p-4 max-w-xl space-y-3.5 shadow-md transition-all">
                  
                  {/* Embed Banner Image */}
                  {config.embedImageUrl && (
                    <div className="w-full rounded overflow-hidden bg-zinc-900 border border-zinc-800">
                      <img
                        src={config.embedImageUrl}
                        alt="Embed Banner"
                        className="w-full h-auto object-cover max-h-60"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}

                  {/* Embed Title */}
                  {config.embedTitle && (
                    <h3 className="font-bold text-white text-md tracking-wide">
                      {config.embedTitle}
                    </h3>
                  )}

                  {/* Embed Description */}
                  <div className="leading-relaxed text-[#dbdee1]">
                    {formatMarkdown(config.embedDescription)}
                  </div>

                  {/* Embed Mock Stock Section */}
                  <div className="font-mono bg-[#1e1f22] border border-[#2b2d31] rounded p-3.5 space-y-1 text-xs text-[#dbdee1]">
                    <div className="text-[#57F287] font-bold mb-1">⭐ TOTAL STOCK KEYS ⭐</div>
                    <div className="text-zinc-600">----------------------------------------</div>
                    <div>⚡ 1 Days   - [ 📦 12 Keys ]  <span className="text-zinc-500">| ราคา {config.price1Day} บาท</span></div>
                    <div>📅 7 Days   - [ 📦 8 Keys ]   <span className="text-zinc-500">| ราคา {config.price7Days} บาท</span></div>
                    <div>🧩 30 Days  - [ 📦 4 Keys ]   <span className="text-zinc-500">| ราคา {config.price30Days} บาท</span></div>
                    <div>♾️ Lifetime - [ 📦 2 Keys ]   <span className="text-zinc-500">| ราคา {config.priceLifetime} บาท</span></div>
                    <div className="text-zinc-600">----------------------------------------</div>
                    <div className="text-zinc-400">💰 SOLD - 95 Keys</div>
                  </div>

                  {/* Embed Mock Footer */}
                  <div className="text-[9px] text-[#949ba4] font-normal flex items-center gap-1.5 border-t border-zinc-800/40 pt-2 mt-2">
                    <span>Ready Manager bot</span>
                    <span>•</span>
                    <span>วันนี้ เวลา 22:33 น.</span>
                  </div>

                </div>

                {/* Discord Interactive Buttons */}
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <button type="button" className="bg-[#248046] hover:bg-[#1a6535] text-white px-4 py-1.5 rounded text-xs font-medium shadow-sm transition">
                    <span>BUY KEY</span>
                  </button>
                  <button type="button" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-1.5 rounded text-xs font-medium shadow-sm transition">
                    <span>DOWNLOAD</span>
                  </button>
                  <button type="button" className="bg-[#da373c] hover:bg-[#a92b2f] text-white px-4 py-1.5 rounded text-xs font-medium shadow-sm transition">
                    <span>RESET HWID</span>
                  </button>
                  <button type="button" className="bg-[#4e5058] hover:bg-[#6d6f78] text-white px-4 py-1.5 rounded text-xs font-medium shadow-sm transition">
                    <span>CLAIM KEY</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Quick instructions alert */}
          <div className="bg-[#5865f2]/10 border border-[#5865f2]/20 rounded-xl p-4 text-xs text-[#5865f2] leading-relaxed">
            <span className="font-bold flex items-center gap-1 mb-1">
              <ExternalLink size={13} />
              คำแนะนำการออกแบบหน้า Embed:
            </span>
            - รูปแบบแบนเนอร์ด้านบน แนะนำให้ใช้รูปภาพสัดส่วนแนวนอน (เช่น 16:9 หรือ 2:1) เพื่อสัดส่วนที่สวยงามบน Discord<br />
            - รายละเอียดรองรับการจัดรูปแบบข้อความของ Discord เช่น การทำตัวหนาด้วยเครื่องหมาย `**ข้อความ**` และสร้างกล่องคำเตือนด้วยบล็อกคำพูด `` `คำเตือน` ``
          </div>
        </div>
      </div>
    </div>
  )
}

export default BotSettings
