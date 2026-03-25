'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ═══ TYPES ═══
interface VibeType { c: string; osc: OscillatorType; em: string; key: string }
interface Mood { n: string; em: string; scale: number[]; tempo: number; color: string }
interface Player { id: string; name: string; vibe_key: string; clout: number; spot_id: string; lat: number; lng: number; last_seen: string; _x?: number; _y?: number; _r?: number }
interface FeedItem { t: 'ping' | 'event'; from?: { name: string; vibe_key: string }; to?: { name: string; vibe_key: string }; msg?: string; mood?: number; resp?: string | null; text?: string; time: number }
interface Spot { id: string; name: string; latitude: number; longitude: number; spot_type: string }
interface Props { spots: Spot[]; onClose: () => void; userLocation?: { lat: number; lng: number } | null; mapInstance?: google.maps.Map | null }

// ═══ CONFIG ═══
const VT: Record<string, VibeType> = {
  'SIGNAL BOOST': { c: '#00d4ff', osc: 'sawtooth', em: '📡', key: 'signal_boost' },
  'DEEP CRYPT': { c: '#9b30ff', osc: 'square', em: '🔮', key: 'deep_crypt' },
  'STATIC FLUX': { c: '#ff3399', osc: 'sawtooth', em: '⚡', key: 'static_flux' },
  'GROUND ZERO': { c: '#ff4400', osc: 'triangle', em: '💥', key: 'ground_zero' },
  'HOT TAKE': { c: '#ffaa00', osc: 'square', em: '🔥', key: 'hot_take' },
  'FLOW STATE': { c: '#00ffaa', osc: 'sine', em: '🌊', key: 'flow_state' },
  'FREQUENCY': { c: '#7b61ff', osc: 'square', em: '🎵', key: 'frequency' },
  'BEDROCK': { c: '#c4956a', osc: 'square', em: '🏔️', key: 'bedrock' },
}
const TN = Object.keys(VT)
const RANKS = [{ n: 'GHOST', em: '👻', min: 0, c: '#666' }, { n: 'SIGNAL', em: '⚡', min: 5, c: '#00aaff' }, { n: 'FREQUENCY', em: '🔥', min: 25, c: '#ff6600' }, { n: 'STATIC', em: '💀', min: 100, c: '#cc00ff' }, { n: 'VIBE GOD', em: '👑', min: 500, c: '#ffd700' }]
const MOODS: Mood[] = [
  { n: 'CHILL', em: '😎', scale: [0, 2, 4, 7, 9], tempo: 90, color: '#00aaff' },
  { n: 'HYPE', em: '🔥', scale: [0, 2, 4, 5, 7, 9, 11], tempo: 140, color: '#ff4400' },
  { n: 'INTENSE', em: '💀', scale: [0, 1, 4, 5, 7, 8, 11], tempo: 115, color: '#cc00ff' },
  { n: 'DREAMY', em: '✨', scale: [0, 2, 4, 7, 9], tempo: 68, color: '#9b30ff' },
  { n: 'CHAOTIC', em: '🌀', scale: [0, 1, 3, 6, 7, 10], tempo: 155, color: '#ff3399' },
]

function getRank(c: number) { let r = RANKS[0]; RANKS.forEach(x => { if (c >= x.min) r = x }); return r }

// ═══ AUDIO ═══
let actx: AudioContext | null = null
function ac() { if (!actx) actx = new AudioContext(); if (actx.state === 'suspended') actx.resume(); return actx }
function nf(s: number) { return 130.81 * Math.pow(2, s / 12) }

function playPing(text: string, mood: number, vibeKey: string) {
  const ctx = ac(); const md = MOODS[mood] || MOODS[0]; const v = VT[vibeKey] || VT['SIGNAL BOOST']
  const master = ctx.createGain(); master.gain.value = 0.25; master.connect(ctx.destination)
  const bd = 60 / md.tempo; let t = ctx.currentTime + 0.05
  text.toLowerCase().split('').forEach((ch, i) => {
    const si = ch.charCodeAt(0) % md.scale.length
    const freq = nf(md.scale[si] + 12 + (Math.floor(i / md.scale.length) % 2) * 12)
    const isVowel = 'aeiou'.includes(ch)
    const dur = isVowel ? 0.2 : 0.09; const vel = isVowel ? 0.5 : 0.2
    const nt = t + i * bd * 0.5
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = v.osc; osc.frequency.value = freq
    g.gain.setValueAtTime(0, nt); g.gain.linearRampToValueAtTime(vel * 0.4, nt + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, nt + dur + 0.1)
    osc.connect(g); g.connect(master); osc.start(nt); osc.stop(nt + dur + 0.15)
  })
}

function playEcho(text: string, mood: number, sType: string, rType: string) {
  const ctx = ac(); const md = MOODS[mood] || MOODS[0]
  const m = ctx.createGain(); m.gain.value = 0.2; m.connect(ctx.destination)
  const bd = 60 / md.tempo * 0.5; let t = ctx.currentTime + 0.05
  text.toLowerCase().split('').slice(0, 10).forEach((ch, i) => {
    const freq = nf(md.scale[ch.charCodeAt(0) % md.scale.length] + 12)
    const nt = t + i * bd
    ;[sType, rType].forEach((type, j) => {
      const v = VT[type] || VT['SIGNAL BOOST']
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = v.osc; osc.frequency.value = freq * (j === 0 ? 1 : 1.5)
      g.gain.setValueAtTime(0, nt + j * 0.03); g.gain.linearRampToValueAtTime(0.25, nt + j * 0.03 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, nt + 0.2); osc.connect(g); g.connect(m)
      osc.start(nt + j * 0.03); osc.stop(nt + 0.25)
    })
  })
}

function playDistort(text: string, mood: number) {
  const ctx = ac(); const md = MOODS[mood] || MOODS[0]
  const m = ctx.createGain(); m.gain.value = 0.2
  const ws = ctx.createWaveShaper(); const cu = new Float32Array(256)
  for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; cu[i] = ((303) * x * 20 * (Math.PI / 180)) / (Math.PI + 100 * Math.abs(x)) }
  ws.curve = cu; m.connect(ws); ws.connect(ctx.destination)
  let t = ctx.currentTime + 0.05
  text.split('').reverse().slice(0, 8).forEach((ch, i) => {
    const freq = nf(md.scale[ch.charCodeAt(0) % md.scale.length] + 6)
    const nt = t + i * 0.08; const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'sawtooth'; osc.frequency.value = freq
    g.gain.setValueAtTime(0, nt); g.gain.linearRampToValueAtTime(0.35, nt + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, nt + 0.12); osc.connect(g); g.connect(m)
    osc.start(nt); osc.stop(nt + 0.15)
  })
}

// ═══ MAIN COMPONENT ═══
export default function VibeCheckOverlay({ spots, onClose, userLocation, mapInstance }: Props) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sweepRef = useRef(0)
  const afRef = useRef(0)

  // State
  const [me, setMe] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [nearestSpot, setNearestSpot] = useState<Spot | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [compTarget, setCompTarget] = useState<Player | null>(null)
  const [compText, setCompText] = useState('')
  const [compMood, setCompMood] = useState(0)
  const [showRes, setShowRes] = useState(false)
  const [resData, setResData] = useState<{ from: Player; msg: string; mood: number } | null>(null)
  const [resTimer, setResTimer] = useState(30)
  const resRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-assign vibe type (skip quiz)
  useEffect(() => {
    const saved = localStorage.getItem('vc14_vibe_type')
    const savedName = localStorage.getItem('vc14_name')
    if (saved && savedName && VT[saved]) {
      initPlayer(saved, savedName)
    } else {
      // Auto-assign random vibe
      const vibe = TN[Math.floor(Math.random() * TN.length)]
      const name = vibe.split(' ').map(w => w[0]).join('') + '-' + Math.random().toString(36).slice(2, 6)
      localStorage.setItem('vc14_vibe_type', vibe)
      localStorage.setItem('vc14_name', name)
      localStorage.setItem('vibe_key', VT[vibe].key)
      localStorage.setItem('vibe_name', vibe)
      localStorage.setItem('vibe_emoji', VT[vibe].em)
      localStorage.setItem('vibe_username', name)
      initPlayer(vibe, name)
    }
  }, [])

  // Find nearest spot
  useEffect(() => {
    if (spots.length === 0) return
    if (!userLocation) { setNearestSpot(spots[0]); return }
    let best = spots[0]; let bestDist = Infinity
    spots.forEach(s => {
      const d = Math.hypot(s.latitude - userLocation.lat, s.longitude - userLocation.lng)
      if (d < bestDist) { best = s; bestDist = d }
    })
    setNearestSpot(best)
  }, [userLocation, spots])

  async function initPlayer(vibeType: string, name: string) {
    const v = VT[vibeType]; const spot = nearestSpot
    const player: Player = {
      id: 'local_' + Math.random().toString(36).slice(2, 10),
      name, vibe_key: vibeType, clout: 0, spot_id: spot?.id || '',
      lat: userLocation?.lat || 34.05, lng: userLocation?.lng || -118.24, last_seen: new Date().toISOString(),
    }
    try {
      const { data } = await supabase.from('vc_players').insert({
        name, vibe_key: v.key, vibe_name: vibeType, vibe_emoji: v.em,
        lat: player.lat, lng: player.lng, spot_id: spot?.id || null,
        session_code: spot?.id?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'GLOBAL',
        last_seen: new Date().toISOString(), clout: 0, sent: 0, recv: 0,
      }).select('id').single()
      if (data) player.id = data.id
    } catch { /* local fallback */ }
    setMe(player)
  }

  // Spawn bots after init
  useEffect(() => {
    if (!me) return
    const timeout = setTimeout(() => {
      const names = ['NOVA', 'ECHO-7', 'DRIFT', 'PULSE', 'CIPHER', 'HAZE', 'VOID', 'FLUX', 'ROOT', 'EMBER']
      const bots: Player[] = names.slice(0, 5 + Math.floor(Math.random() * 5)).map((name, i) => ({
        id: `bot_${i}`, name, vibe_key: TN[Math.floor(Math.random() * TN.length)],
        clout: Math.floor(Math.random() * 120), spot_id: nearestSpot?.id || '',
        lat: 0, lng: 0, last_seen: new Date().toISOString(),
      }))
      setPlayers(bots)
      addEvent('🏔️ PIONEER — first vibe at this spot!')
    }, 1500)
    return () => clearTimeout(timeout)
  }, [me])

  // Bot tick
  useEffect(() => {
    if (!me) return
    const iv = setInterval(() => {
      setPlayers(prev => {
        if (prev.length < 2 || Math.random() > 0.35) return prev
        const from = prev[Math.floor(Math.random() * prev.length)]
        const msgs = ['vibes', 'yo', '🔥', 'mood', 'bet', 'sup', 'wavy', 'hey', 'lets go']
        const msg = msgs[Math.floor(Math.random() * msgs.length)]
        const mood = Math.floor(Math.random() * MOODS.length)
        // Sometimes ping player
        if (Math.random() < 0.2 && !showRes) {
          setResData({ from, msg, mood }); setResTimer(30); setShowRes(true)
          playPing(msg, mood, from.vibe_key)
        } else {
          const to = prev.filter(p => p.id !== from.id)[Math.floor(Math.random() * (prev.length - 1))]
          if (to) {
            addFeed(from, to, msg, mood, null)
            setTimeout(() => {
              const r = Math.random()
              if (r < 0.4) addFeed(to, from, msg, mood, 'echo')
              else if (r < 0.55) addFeed(to, from, msg, mood, 'distort')
              else addFeed(to, from, msg, mood, 'absorb')
            }, 800 + Math.random() * 2000)
          }
        }
        return prev
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [me, showRes])

  // Heartbeat
  useEffect(() => {
    if (!me || me.id.startsWith('local_')) return
    const hb = setInterval(() => {
      supabase.from('vc_players').update({ last_seen: new Date().toISOString() }).eq('id', me.id)
    }, 20000)
    return () => clearInterval(hb)
  }, [me])

  // Resonance timer
  useEffect(() => {
    if (!showRes) return
    resRef.current = setInterval(() => {
      setResTimer(prev => { if (prev <= 1) { handleRespond('absorb'); return 30 } return prev - 1 })
    }, 1000)
    return () => { if (resRef.current) clearInterval(resRef.current) }
  }, [showRes])

  // ═══ RADAR CANVAS ═══
  useEffect(() => {
    if (!me) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas!.width = window.innerWidth * dpr; canvas!.height = window.innerHeight * dpr
      ctx!.scale(dpr, dpr)
    }
    resize(); window.addEventListener('resize', resize)

    function frame() {
      const W = window.innerWidth, H = window.innerHeight
      ctx!.clearRect(0, 0, W, H)

      // Dark overlay for contrast
      ctx!.fillStyle = 'rgba(0,0,0,0.25)'
      ctx!.fillRect(0, 0, W, H)

      // Center radar on nearest spot's position on the map
      let cx = W / 2, cy = H / 2
      if (mapInstance && nearestSpot) {
        try {
          const proj = mapInstance.getProjection()
          const bounds = mapInstance.getBounds()
          const ne = bounds?.getNorthEast()
          const sw = bounds?.getSouthWest()
          if (proj && ne && sw) {
            const worldPoint = proj.fromLatLngToPoint(new google.maps.LatLng(nearestSpot.latitude, nearestSpot.longitude))
            const neWorld = proj.fromLatLngToPoint(ne)
            const swWorld = proj.fromLatLngToPoint(sw)
            if (worldPoint && neWorld && swWorld) {
              const scale = Math.pow(2, mapInstance.getZoom()!)
              cx = (worldPoint.x - swWorld.x) * scale / (neWorld.x - swWorld.x) * W
              cy = (worldPoint.y - neWorld.y) * scale / (swWorld.y - neWorld.y) * H
            }
          }
        } catch { /* fallback to screen center */ }
      }
      const maxR = Math.min(W, H) * 0.4

      // Grid rings
      ;[0.25, 0.5, 0.75, 1].forEach(r => {
        ctx!.beginPath(); ctx!.arc(cx, cy, maxR * r, 0, Math.PI * 2)
        ctx!.strokeStyle = 'rgba(255,51,102,0.06)'; ctx!.lineWidth = 1; ctx!.stroke()
      })
      // Crosshairs
      ctx!.beginPath(); ctx!.moveTo(cx - maxR, cy); ctx!.lineTo(cx + maxR, cy)
      ctx!.moveTo(cx, cy - maxR); ctx!.lineTo(cx, cy + maxR)
      ctx!.strokeStyle = 'rgba(255,51,102,0.04)'; ctx!.stroke()

      // SWEEP LINE
      sweepRef.current += 0.015
      const sweep = sweepRef.current
      ctx!.beginPath(); ctx!.moveTo(cx, cy)
      ctx!.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR)
      ctx!.strokeStyle = 'rgba(255,51,102,0.4)'; ctx!.lineWidth = 2; ctx!.stroke()

      // Sweep glow trail
      ctx!.save(); ctx!.beginPath(); ctx!.moveTo(cx, cy)
      ctx!.arc(cx, cy, maxR, sweep - 0.6, sweep); ctx!.closePath()
      const sg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      sg.addColorStop(0, 'rgba(255,51,102,0.1)'); sg.addColorStop(0.6, 'rgba(255,51,102,0.03)'); sg.addColorStop(1, 'rgba(255,51,102,0)')
      ctx!.fillStyle = sg; ctx!.fill(); ctx!.restore()

      // PLAYER DOTS
      players.forEach((p, idx) => {
        const a = (idx / Math.max(1, players.length)) * Math.PI * 2 + Math.sin(Date.now() / 12000) * 0.04
        const nd = 0.25 + ((idx * 7 + 3) % 5) / 8
        const px = cx + Math.cos(a) * nd * maxR
        const py = cy + Math.sin(a) * nd * maxR
        const v = VT[p.vibe_key] || { c: '#555' }
        const dr = Math.max(5, Math.min(9, 4 + p.clout / 40))

        // Glow
        const gr = ctx!.createRadialGradient(px, py, 0, px, py, dr + 8)
        gr.addColorStop(0, v.c + '30'); gr.addColorStop(1, v.c + '00')
        ctx!.beginPath(); ctx!.arc(px, py, dr + 8, 0, Math.PI * 2); ctx!.fillStyle = gr; ctx!.fill()

        // Dot
        ctx!.beginPath(); ctx!.arc(px, py, dr, 0, Math.PI * 2)
        ctx!.fillStyle = v.c; ctx!.globalAlpha = 0.85; ctx!.fill(); ctx!.globalAlpha = 1
        ctx!.strokeStyle = v.c + '60'; ctx!.lineWidth = 1; ctx!.stroke()

        // Sweep flash
        const da = Math.atan2(py - cy, px - cx)
        const sn = ((sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const dn = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (Math.abs(sn - dn) < 0.3 || Math.abs(sn - dn) > Math.PI * 2 - 0.3) {
          ctx!.beginPath(); ctx!.arc(px, py, dr + 4, 0, Math.PI * 2)
          ctx!.strokeStyle = v.c + '80'; ctx!.lineWidth = 2; ctx!.stroke()
        }

        // Name
        ctx!.font = '700 9px monospace'; ctx!.fillStyle = 'rgba(255,255,255,0.5)'
        ctx!.textAlign = 'center'; ctx!.fillText(p.name, px, py + dr + 13)

        p._x = px; p._y = py; p._r = dr
      })

      // ME — center
      const mv = VT[me!.vibe_key] || { c: '#fff' }
      const mg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 18)
      mg.addColorStop(0, mv.c + '30'); mg.addColorStop(1, mv.c + '00')
      ctx!.beginPath(); ctx!.arc(cx, cy, 18, 0, Math.PI * 2); ctx!.fillStyle = mg; ctx!.fill()
      ctx!.beginPath(); ctx!.arc(cx, cy, 7, 0, Math.PI * 2); ctx!.fillStyle = mv.c; ctx!.fill()
      ctx!.strokeStyle = mv.c + '60'; ctx!.lineWidth = 1.5; ctx!.stroke()
      ctx!.font = '700 9px monospace'; ctx!.fillStyle = 'rgba(255,255,255,0.7)'
      ctx!.textAlign = 'center'; ctx!.fillText('YOU', cx, cy + 22)

      afRef.current = requestAnimationFrame(frame)
    }
    frame()
    return () => { cancelAnimationFrame(afRef.current); window.removeEventListener('resize', resize) }
  }, [me, players, mapInstance, nearestSpot])

  // ═══ ACTIONS ═══
  function addFeed(from: Partial<Player>, to: Partial<Player>, msg: string, mood: number, resp: string | null) {
    setFeed(prev => [{ t: 'ping' as const, from: { name: from.name || '?', vibe_key: from.vibe_key || '' }, to: { name: to.name || '?', vibe_key: to.vibe_key || '' }, msg, mood, resp, time: Date.now() }, ...prev].slice(0, 30))
  }
  function addEvent(text: string) {
    setFeed(prev => [{ t: 'event' as const, text, time: Date.now() }, ...prev].slice(0, 30))
  }

  function handleRespond(action: string) {
    if (resRef.current) clearInterval(resRef.current)
    setShowRes(false)
    if (!resData || !me) return
    const { from, msg, mood } = resData
    if (action === 'echo') { playEcho(msg, mood, from.vibe_key, me.vibe_key); addFeed(from, me, msg, mood, 'echo'); addEvent(`✨ ECHOED ${from.name}!`) }
    else if (action === 'distort') { playDistort(msg, mood); addFeed(from, me, msg, mood, 'distort'); addEvent(`💀 DISTORTED ${from.name}`) }
    else { addFeed(from, me, msg, mood, 'absorb') }
    setMe(prev => prev ? { ...prev, clout: prev.clout + (action === 'absorb' ? 1 : 3) } : prev)
    setResData(null)
  }

  function handleSendPing() {
    if (!compTarget || !compText.trim() || !me) return
    playPing(compText, compMood, me.vibe_key)
    addFeed(me, compTarget, compText, compMood, null)
    const target = compTarget
    setTimeout(() => {
      const r = Math.random()
      if (r < 0.45) { playEcho(compText, compMood, me.vibe_key, target.vibe_key); addFeed(target, me, compText, compMood, 'echo'); addEvent(`✨ ${target.name} ECHOED!`); setMe(prev => prev ? { ...prev, clout: prev.clout + 2 } : prev) }
      else if (r < 0.65) { playDistort(compText, compMood); addFeed(target, me, compText, compMood, 'distort'); addEvent(`💀 ${target.name} DISTORTED`) }
      else { addFeed(target, me, compText, compMood, 'absorb') }
    }, 1000 + Math.random() * 2000)
    setShowComposer(false); setCompText(''); setCompTarget(null)
  }

  // Click handler for radar canvas
  function handleCanvasClick(e: React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    for (const p of players) {
      if (p._x !== undefined && Math.hypot(mx - p._x, my - p._y!) < Math.max(20, (p._r || 6) + 12)) {
        setCompTarget(p); setShowComposer(true); return
      }
    }
  }

  if (!me) return null
  const myRank = getRank(me.clout)

  return (
    <div className="fixed inset-0 z-30 pointer-events-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* RADAR CANVAS */}
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="absolute inset-0 z-10 pointer-events-auto" style={{ width: '100%', height: '100%' }} />

      {/* VC STATUS — top-left pill */}
      <div className="pointer-events-auto absolute top-[52px] left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 z-20">
        <span className="font-mono text-[10px] font-bold bg-gradient-to-r from-[#ff3366] to-[#7b61ff] bg-clip-text text-transparent">VC</span>
        <span className="font-mono text-[9px]" style={{ color: myRank.c }}>{myRank.em} {myRank.n}</span>
        <span className="font-mono text-[10px] font-bold text-[#ffd700]">{me.clout}</span>
        <button onClick={onClose} className="text-white/30 hover:text-white text-[10px] ml-0.5">✕</button>
      </div>

      {/* LIVE CHAT + INLINE RESONANCE — right side, dark panel */}
      <div className="pointer-events-auto absolute top-[52px] right-0 w-[230px] max-h-[50vh] overflow-y-auto z-20 bg-black/80 backdrop-blur-md border-l border-white/5"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 100%)' }}>

        {/* INCOMING PING — inline resonance */}
        {showRes && resData && (
          <div className="px-2.5 py-2 mb-0.5 bg-[#ff3366]/10 border-b border-[#ff3366]/20" style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex items-center gap-1 text-[9px] mb-1">
              <span className="text-white/40 font-mono">PING FROM</span>
              <span className="font-bold" style={{ color: (VT[resData.from.vibe_key] || { c: '#fff' }).c }}>{resData.from.name}</span>
              <span className="ml-auto font-mono text-[10px] font-bold" style={{ color: resTimer <= 10 ? '#ff3366' : '#00ffaa' }}>{resTimer}s</span>
            </div>
            <p className="font-mono text-[11px] text-white mb-1">"{resData.msg}" <span className="text-[9px] text-white/40">{MOODS[resData.mood]?.em}</span></p>
            <div className="flex gap-1">
              <button onClick={() => handleRespond('echo')} className="flex-1 py-1 bg-[#00ffaa] rounded text-[#0a0a0f] font-bold text-[9px] active:scale-95 transition">ECHO</button>
              <button onClick={() => handleRespond('distort')} className="flex-1 py-1 bg-[#ff3366] rounded text-white font-bold text-[9px] active:scale-95 transition">DISTORT</button>
              <button onClick={() => handleRespond('absorb')} className="flex-1 py-1 bg-white/10 rounded text-white/40 font-bold text-[9px] active:scale-95 transition">ABSORB</button>
            </div>
          </div>
        )}

        {/* FEED ITEMS */}
        {feed.slice(0, 8).map((item, i) => {
          if (item.t === 'event') return (
            <div key={i} className="px-2.5 py-1 border-b border-white/5 font-mono text-[8px] text-white/40 text-center">{item.text}</div>
          )
          const fv = VT[item.from?.vibe_key || ''] || { c: '#888' }
          const tv = VT[item.to?.vibe_key || ''] || { c: '#888' }
          const rc = item.resp || ''
          return (
            <div key={i} className={`px-2.5 py-1.5 border-b border-white/5 ${rc === 'absorb' ? 'opacity-30' : ''}`}>
              <div className="flex items-center gap-1 text-[9px]">
                <span className="font-semibold" style={{ color: fv.c }}>{item.from?.name}</span>
                <span className="text-white/15">→</span>
                <span className="font-semibold" style={{ color: tv.c }}>{item.to?.name}</span>
                {rc === 'echo' && <span className="ml-auto text-[7px] text-[#00ffaa] font-mono font-bold">ECHO ✦</span>}
                {rc === 'distort' && <span className="ml-auto text-[7px] text-[#ff3366] font-mono font-bold">DISTORT</span>}
              </div>
              <div className="font-mono text-[8px] text-white/30 truncate">"{item.msg}"</div>
            </div>
          )
        })}

        {feed.length === 0 && (
          <div className="px-3 py-4 text-center text-[9px] text-white/20 font-mono">Waiting for pings...</div>
        )}
      </div>

      {/* SPOT NAME — bottom center */}
      {nearestSpot && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <div className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
            <span className="font-mono text-[9px] text-white/40">📍 {nearestSpot.name}</span>
          </div>
        </div>
      )}

      {/* COMPOSER */}
      {showComposer && compTarget && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex flex-col justify-end">
          <div className="bg-[#12121a] rounded-t-2xl p-5" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white text-sm">Ping {compTarget.name}</span>
              <button onClick={() => { setShowComposer(false); setCompTarget(null) }} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-sm">×</button>
            </div>
            <input value={compText} onChange={e => setCompText(e.target.value.slice(0, 20))} maxLength={20}
              placeholder="say something..." autoFocus
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#7b61ff] mb-2"
              onKeyDown={e => { if (e.key === 'Enter') handleSendPing() }} />
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {MOODS.map((m, i) => (
                <button key={i} onClick={() => setCompMood(i)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${i === compMood ? 'border-[#ff3366] bg-[#ff3366]/10 text-white' : 'border-white/10 text-white/40'}`}>
                  {m.em} {m.n}
                </button>
              ))}
            </div>
            <button onClick={handleSendPing} disabled={!compText.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#ff3366] to-[#7b61ff] rounded-xl text-white font-bold disabled:opacity-30 active:scale-[0.97] transition text-sm">
              THROW IT ⚡
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}
