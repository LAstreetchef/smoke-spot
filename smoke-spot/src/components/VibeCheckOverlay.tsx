'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ═══ TYPES ═══
interface VibeType {
  c: string; osc: OscillatorType; fx: string
  strong: string; weak: string; em: string; d: string; key: string
}

interface Rank { n: string; em: string; min: number; c: string }
interface Mood { n: string; em: string; scale: number[]; tempo: number; color: string }

interface Player {
  id: string; name: string; vibe_key: string; clout: number
  spot_id: string; lat: number; lng: number
  sent: number; recv: number; is_throne: boolean
  last_seen: string; linked_to: string[]
}

interface FeedItem {
  t: 'ping' | 'event'
  from?: { name: string; vibe_key: string; clout: number }
  to?: { name: string; vibe_key: string }
  msg?: string; mood?: number; resp?: string | null
  text?: string; cls?: string; time: number
}

interface Spot {
  id: string; name: string; latitude: number; longitude: number; spot_type: string
}

interface VibeCheckOverlayProps {
  spots: Spot[]
  onClose: () => void
  userLocation?: { lat: number; lng: number } | null
}

// ═══ CONFIG ═══
const VT: Record<string, VibeType> = {
  'SIGNAL BOOST': { c: '#00d4ff', osc: 'sawtooth', fx: 'delay', strong: 'DEEP CRYPT', weak: 'STATIC FLUX', em: '📡', d: 'You amplify everything around you.', key: 'signal_boost' },
  'DEEP CRYPT': { c: '#9b30ff', osc: 'square', fx: 'bitcrush', strong: 'GROUND ZERO', weak: 'SIGNAL BOOST', em: '🔮', d: 'Mysterious, magnetic, underground.', key: 'deep_crypt' },
  'STATIC FLUX': { c: '#ff3399', osc: 'sawtooth', fx: 'lfo', strong: 'SIGNAL BOOST', weak: 'HOT TAKE', em: '⚡', d: 'Unpredictable. Nobody can look away.', key: 'static_flux' },
  'GROUND ZERO': { c: '#ff4400', osc: 'triangle', fx: 'distort', strong: 'FLOW STATE', weak: 'DEEP CRYPT', em: '💥', d: 'Raw impact. The room rearranges.', key: 'ground_zero' },
  'HOT TAKE': { c: '#ffaa00', osc: 'square', fx: 'tremolo', strong: 'STATIC FLUX', weak: 'FREQUENCY', em: '🔥', d: 'You say what nobody else will.', key: 'hot_take' },
  'FLOW STATE': { c: '#00ffaa', osc: 'sine', fx: 'chorus', strong: 'FREQUENCY', weak: 'GROUND ZERO', em: '🌊', d: 'Effortless gravity.', key: 'flow_state' },
  'FREQUENCY': { c: '#7b61ff', osc: 'square', fx: 'phaser', strong: 'HOT TAKE', weak: 'BEDROCK', em: '🎵', d: 'You set the rhythm.', key: 'frequency' },
  'BEDROCK': { c: '#c4956a', osc: 'square', fx: 'sweep', strong: 'STATIC FLUX', weak: 'FLOW STATE', em: '🏔️', d: 'Unshakeable. Ancient energy.', key: 'bedrock' },
}
const TN = Object.keys(VT)
const RANKS: Rank[] = [
  { n: 'GHOST', em: '👻', min: 0, c: '#444' },
  { n: 'SIGNAL', em: '⚡', min: 5, c: '#00aaff' },
  { n: 'FREQUENCY', em: '🔥', min: 25, c: '#ff6600' },
  { n: 'STATIC', em: '💀', min: 100, c: '#cc00ff' },
  { n: 'VIBE GOD', em: '👑', min: 500, c: '#ffd700' },
]
const MOODS: Mood[] = [
  { n: 'CHILL', em: '😎', scale: [0, 2, 4, 7, 9], tempo: 90, color: '#00aaff' },
  { n: 'HYPE', em: '🔥', scale: [0, 2, 4, 5, 7, 9, 11], tempo: 140, color: '#ff4400' },
  { n: 'INTENSE', em: '💀', scale: [0, 1, 4, 5, 7, 8, 11], tempo: 115, color: '#cc00ff' },
  { n: 'DREAMY', em: '✨', scale: [0, 2, 4, 7, 9], tempo: 68, color: '#9b30ff' },
  { n: 'CHAOTIC', em: '🌀', scale: [0, 1, 3, 6, 7, 10], tempo: 155, color: '#ff3399' },
]
const QUIZ = [
  { q: "You walk into a packed room. First move?", opts: [
    { t: "Find the loudest group and join", ty: ['SIGNAL BOOST', 'HOT TAKE'] },
    { t: "Post up and let people come to me", ty: ['DEEP CRYPT', 'BEDROCK'] },
    { t: "Float around, read the room first", ty: ['FLOW STATE', 'FREQUENCY'] },
    { t: "Do something unexpected", ty: ['STATIC FLUX', 'GROUND ZERO'] },
  ]},
  { q: "Someone sends you a bold message:", opts: [
    { t: "Match their energy and escalate", ty: ['HOT TAKE', 'GROUND ZERO'] },
    { t: "Reply with something cryptic", ty: ['DEEP CRYPT', 'FREQUENCY'] },
    { t: "Leave them on read", ty: ['BEDROCK', 'FLOW STATE'] },
    { t: "Screenshot and share", ty: ['SIGNAL BOOST', 'STATIC FLUX'] },
  ]},
  { q: "What makes someone impossible to ignore?", opts: [
    { t: "They say what everyone's thinking", ty: ['HOT TAKE', 'SIGNAL BOOST'] },
    { t: "They don't need anyone's approval", ty: ['BEDROCK', 'DEEP CRYPT'] },
    { t: "They make everything feel effortless", ty: ['FLOW STATE', 'FREQUENCY'] },
    { t: "You never know what they'll do next", ty: ['STATIC FLUX', 'GROUND ZERO'] },
  ]},
  { q: "Pick a sound:", opts: [
    { t: "Deep bass that vibrates your chest", ty: ['GROUND ZERO', 'BEDROCK'] },
    { t: "A melody stuck in your head forever", ty: ['FREQUENCY', 'FLOW STATE'] },
    { t: "Distortion and feedback", ty: ['STATIC FLUX', 'HOT TAKE'] },
    { t: "Crystal signal cutting through noise", ty: ['SIGNAL BOOST', 'DEEP CRYPT'] },
  ]},
  { q: "Your legacy after you leave a room:", opts: [
    { t: "Everyone's still quoting me", ty: ['HOT TAKE', 'SIGNAL BOOST'] },
    { t: "The vibe changed when I walked in", ty: ['GROUND ZERO', 'STATIC FLUX'] },
    { t: "People felt something unexplainable", ty: ['DEEP CRYPT', 'FLOW STATE'] },
    { t: "The room was better because of me", ty: ['BEDROCK', 'FREQUENCY'] },
  ]},
]

// ═══ HELPERS ═══
function getRank(c: number) { let r = RANKS[0]; RANKS.forEach(x => { if (c >= x.min) r = x }); return r }
function rankMult(c: number) { const r = getRank(c); const i = RANKS.indexOf(r); return [1, 2, 4, 8, 16][i] || 1 }
function vibeCombo(a: string, b: string) {
  if (a === b) return 'same'
  const v = VT[a]; if (v?.strong === b) return 'strong'; if (v?.weak === b) return 'weak'; return 'neutral'
}
function comboMult(c: string) { return { strong: 2, same: 1.5, weak: 0.5, neutral: 1 }[c] || 1 }

// ═══ AUDIO ENGINE ═══
let actx: AudioContext | null = null
function ac() {
  if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (actx.state === 'suspended') actx.resume()
  return actx
}
const BF = 130.81
function nf(s: number) { return BF * Math.pow(2, s / 12) }

function mkVoice(ctx: AudioContext, type: string, dest: AudioNode) {
  const v = VT[type] || VT['SIGNAL BOOST']
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = v.osc; g.gain.value = 0; osc.connect(g)
  // Simplified FX — connect to dest
  g.connect(dest)
  return { osc, gain: g }
}

function txt2mel(text: string, scale: number[]) {
  const vow = 'aeiou'
  return text.toLowerCase().split('').map((ch, i) => {
    const code = ch.charCodeAt(0) || 0
    const si = code % scale.length
    const semi = scale[si] + (1 + Math.floor(i / scale.length) % 2) * 12
    const iv = vow.includes(ch)
    return { freq: nf(semi), dur: iv ? 0.2 : 0.09, vel: iv ? 0.6 : 0.25 }
  })
}

function playPing(text: string, mood: number, sType: string, sClout: number) {
  const ctx = ac()
  const md = MOODS[mood] || MOODS[0]
  const mel = txt2mel(text, md.scale)
  const master = ctx.createGain(); master.gain.value = 0.25; master.connect(ctx.destination)
  const bd = 60 / md.tempo
  let t = ctx.currentTime + 0.05
  mel.forEach((note, i) => {
    const nt = t + i * bd * 0.5
    const vo = mkVoice(ctx, sType, master)
    vo.osc.frequency.value = note.freq
    vo.gain.gain.setValueAtTime(0, nt)
    vo.gain.gain.linearRampToValueAtTime(note.vel * 0.4, nt + 0.01)
    vo.gain.gain.exponentialRampToValueAtTime(0.001, nt + note.dur + 0.1)
    vo.osc.start(nt); vo.osc.stop(nt + note.dur + 0.15)
  })
}

function playEcho(text: string, mood: number, sType: string, rType: string) {
  const ctx = ac(); const md = MOODS[mood] || MOODS[0]; const mel = txt2mel(text, md.scale)
  const m = ctx.createGain(); m.gain.value = 0.2; m.connect(ctx.destination)
  const bd = 60 / md.tempo * 0.5; let t = ctx.currentTime + 0.05
  mel.forEach((n, i) => {
    const nt = t + i * bd
    const v1 = mkVoice(ctx, sType, m); v1.osc.frequency.value = n.freq
    v1.gain.gain.setValueAtTime(0, nt); v1.gain.gain.linearRampToValueAtTime(n.vel * 0.3, nt + 0.01)
    v1.gain.gain.exponentialRampToValueAtTime(0.001, nt + n.dur + 0.1); v1.osc.start(nt); v1.osc.stop(nt + n.dur + 0.15)
    const v2 = mkVoice(ctx, rType, m); v2.osc.frequency.value = n.freq * 1.5
    v2.gain.gain.setValueAtTime(0, nt + 0.03); v2.gain.gain.linearRampToValueAtTime(n.vel * 0.2, nt + 0.04)
    v2.gain.gain.exponentialRampToValueAtTime(0.001, nt + n.dur + 0.1); v2.osc.start(nt + 0.03); v2.osc.stop(nt + n.dur + 0.15)
  })
}

function playDistort(text: string, mood: number) {
  const ctx = ac(); const md = MOODS[mood] || MOODS[0]; const mel = txt2mel(text, md.scale).reverse()
  const m = ctx.createGain(); m.gain.value = 0.2
  const ws = ctx.createWaveShaper(); const cu = new Float32Array(256)
  for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; cu[i] = ((3 + 100) * x * 20 * (Math.PI / 180)) / (Math.PI + 100 * Math.abs(x)) }
  ws.curve = cu; m.connect(ws); ws.connect(ctx.destination)
  const bd = 60 / md.tempo * 0.5; let t = ctx.currentTime + 0.05
  mel.forEach((note, i) => {
    const nt = t + i * bd; const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sawtooth'; o.frequency.value = note.freq * 0.5
    g.gain.setValueAtTime(0, nt); g.gain.linearRampToValueAtTime(0.4, nt + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, nt + 0.15); o.connect(g); g.connect(m); o.start(nt); o.stop(nt + 0.2)
  })
}

// ═══ RADAR CANVAS — renders sweep line + dots over the map ═══
function RadarCanvas({ players, me, nearestSpot, waveActive, onPlayerClick }: {
  players: Player[]; me: Player; nearestSpot: Spot | null; waveActive: boolean
  onPlayerClick: (p: Player) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sweepRef = useRef(0)
  const afRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas!.width = window.innerWidth * dpr
      canvas!.height = window.innerHeight * dpr
      ctx!.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    function frame() {
      const W = window.innerWidth, H = window.innerHeight
      ctx!.clearRect(0, 0, W, H)

      // Center on the map center (roughly middle of screen)
      const cx = W / 2, cy = H / 2
      const maxR = Math.min(W, H) * 0.38

      // Grid rings — very subtle
      ;[0.25, 0.5, 0.75, 1].forEach(r => {
        ctx!.beginPath(); ctx!.arc(cx, cy, maxR * r, 0, Math.PI * 2)
        ctx!.strokeStyle = 'rgba(255,51,102,0.04)'; ctx!.lineWidth = 1; ctx!.stroke()
      })

      // Sweep line
      sweepRef.current += 0.012
      const sweep = sweepRef.current
      ctx!.beginPath(); ctx!.moveTo(cx, cy)
      ctx!.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR)
      ctx!.strokeStyle = 'rgba(255,51,102,0.25)'; ctx!.lineWidth = 1.5; ctx!.stroke()

      // Sweep glow trail
      ctx!.save()
      ctx!.beginPath(); ctx!.moveTo(cx, cy)
      ctx!.arc(cx, cy, maxR, sweep - 0.5, sweep); ctx!.closePath()
      const sg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      sg.addColorStop(0, 'rgba(255,51,102,0.06)')
      sg.addColorStop(0.7, 'rgba(255,51,102,0.02)')
      sg.addColorStop(1, 'rgba(255,51,102,0)')
      ctx!.fillStyle = sg; ctx!.fill(); ctx!.restore()

      // Wave pulse
      if (waveActive) {
        const wr = maxR * (0.9 + Math.sin(Date.now() / 300) * 0.08)
        ctx!.beginPath(); ctx!.arc(cx, cy, wr, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(255,51,102,${0.08 + Math.sin(Date.now() / 500) * 0.04})`
        ctx!.lineWidth = 2; ctx!.stroke()
      }

      // Player dots — distributed around center
      players.forEach((p, idx) => {
        const a = (idx / Math.max(1, players.length)) * Math.PI * 2 + Math.sin(Date.now() / 10000) * 0.05
        const nd = 0.3 + (idx % 3) * 0.2 + Math.sin(idx * 2.399) * 0.1
        const px = cx + Math.cos(a) * nd * maxR
        const py = cy + Math.sin(a) * nd * maxR
        const v = VT[p.vibe_key] || { c: '#555' }
        const dr = p.is_throne ? 9 : Math.max(4, Math.min(7, 3 + p.clout / 60))
        const al = Math.max(0.2, Math.min(1, p.clout / 60 + 0.25))

        // Glow
        if (p.clout >= 20) {
          const gr = ctx!.createRadialGradient(px, py, 0, px, py, dr + 6)
          gr.addColorStop(0, v.c + '18'); gr.addColorStop(1, v.c + '00')
          ctx!.beginPath(); ctx!.arc(px, py, dr + 6, 0, Math.PI * 2); ctx!.fillStyle = gr; ctx!.fill()
        }

        // Dot
        ctx!.beginPath(); ctx!.arc(px, py, dr, 0, Math.PI * 2)
        ctx!.globalAlpha = al; ctx!.fillStyle = v.c; ctx!.fill(); ctx!.globalAlpha = 1

        // Sweep flash
        const da = Math.atan2(py - cy, px - cx)
        const sn = ((sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const dn = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const diff = Math.abs(sn - dn)
        if (diff < 0.25 || diff > Math.PI * 2 - 0.25) {
          ctx!.beginPath(); ctx!.arc(px, py, dr + 3, 0, Math.PI * 2)
          ctx!.strokeStyle = v.c + '60'; ctx!.lineWidth = 1.5; ctx!.stroke()
        }

        // Crown
        if (p.is_throne) { ctx!.font = '10px serif'; ctx!.fillText('👑', px - 5, py - dr - 4) }
        // Name
        ctx!.font = '600 7px Outfit'; ctx!.fillStyle = 'rgba(255,255,255,0.35)'
        ctx!.textAlign = 'center'; ctx!.fillText(p.name, px, py + dr + 10)

        // Store position for click detection
        ;(p as any)._x = px; (p as any)._y = py; (p as any)._r = dr
      })

      // Me — center dot
      const mv = VT[me.vibe_key] || { c: '#fff' }
      const mg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 14)
      mg.addColorStop(0, mv.c + '20'); mg.addColorStop(1, mv.c + '00')
      ctx!.beginPath(); ctx!.arc(cx, cy, 14, 0, Math.PI * 2); ctx!.fillStyle = mg; ctx!.fill()
      ctx!.beginPath(); ctx!.arc(cx, cy, 6, 0, Math.PI * 2); ctx!.fillStyle = mv.c; ctx!.fill()
      ctx!.font = '700 8px monospace'; ctx!.fillStyle = 'rgba(255,255,255,0.6)'
      ctx!.textAlign = 'center'; ctx!.fillText('YOU', cx, cy + 18)

      afRef.current = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(afRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [players, me, nearestSpot, waveActive])

  // Click handler
  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    for (const p of players) {
      const px = (p as any)._x, py = (p as any)._y, pr = (p as any)._r
      if (px !== undefined && Math.hypot(mx - px, my - py) < Math.max(18, (pr || 6) + 10)) {
        onPlayerClick(p); return
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="absolute inset-0 z-10 pointer-events-auto"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

// ═══ COMPONENT ═══
export default function VibeCheckOverlay({ spots, onClose, userLocation }: VibeCheckOverlayProps) {
  const supabase = createClient()

  // State
  const [phase, setPhase] = useState<'quiz' | 'active'>('quiz')
  const [qStep, setQStep] = useState(0)
  const [qScores, setQScores] = useState<Record<string, number>>({})
  const [me, setMe] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [nearestSpot, setNearestSpot] = useState<Spot | null>(null)
  const [waveActive, setWaveActive] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [compTarget, setCompTarget] = useState<Player | null>(null)
  const [compText, setCompText] = useState('')
  const [compMood, setCompMood] = useState(0)
  const [showRes, setShowRes] = useState(false)
  const [resData, setResData] = useState<{ from: Player; msg: string; mood: number } | null>(null)
  const [resTimer, setResTimer] = useState(30)
  const [showNearby, setShowNearby] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const resIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const botRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if user already has a vibe type saved
  useEffect(() => {
    const saved = localStorage.getItem('vc14_vibe_type')
    const savedName = localStorage.getItem('vc14_name')
    if (saved && savedName && VT[saved]) {
      initPlayer(saved, savedName)
    }
  }, [])

  // Find nearest spot
  useEffect(() => {
    if (!userLocation || spots.length === 0) {
      if (spots.length > 0) setNearestSpot(spots[0])
      return
    }
    let best = spots[0]; let bestDist = Infinity
    spots.forEach(s => {
      const d = Math.hypot(s.latitude - userLocation.lat, s.longitude - userLocation.lng)
      if (d < bestDist) { best = s; bestDist = d }
    })
    setNearestSpot(best)
  }, [userLocation, spots])

  // Poll for other players at nearest spot
  useEffect(() => {
    if (!me || !nearestSpot) return
    async function poll() {
      try {
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const { data } = await supabase
          .from('vc_players')
          .select('*')
          .eq('spot_id', nearestSpot!.id)
          .gt('last_seen', thirtyMinAgo)
          .neq('id', me!.id)
        if (data) setPlayers(data as Player[])
      } catch { /* silent */ }
    }
    poll()
    pollRef.current = setInterval(poll, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [me, nearestSpot])

  // Heartbeat — keep last_seen fresh
  useEffect(() => {
    if (!me) return
    const hb = setInterval(async () => {
      await supabase.from('vc_players').update({ last_seen: new Date().toISOString() }).eq('id', me.id)
    }, 20000)
    return () => clearInterval(hb)
  }, [me])

  // Demo bots for empty spots
  useEffect(() => {
    if (!me || players.length > 0) return
    // Spawn demo bots after 3s if nobody else is here
    const timeout = setTimeout(() => {
      if (players.length > 0) return
      const names = ['NOVA', 'ECHO-7', 'DRIFT', 'PULSE', 'CIPHER', 'HAZE', 'VOID', 'FLUX']
      const bots: Player[] = names.slice(0, 4 + Math.floor(Math.random() * 4)).map((name, i) => ({
        id: `bot_${i}`, name, vibe_key: TN[Math.floor(Math.random() * TN.length)],
        clout: Math.floor(Math.random() * 150), spot_id: nearestSpot?.id || '',
        lat: (nearestSpot?.latitude || 0) + (Math.random() - 0.5) * 0.002,
        lng: (nearestSpot?.longitude || 0) + (Math.random() - 0.5) * 0.002,
        sent: 0, recv: 0, is_throne: false, last_seen: new Date().toISOString(), linked_to: [],
      }))
      setPlayers(bots)
      addEvent('🏔️ PIONEER — You are the first vibe at this spot!', 'rank-ev')
    }, 3000)
    return () => clearTimeout(timeout)
  }, [me, players.length, nearestSpot])

  // Bot activity
  useEffect(() => {
    if (!me || phase !== 'active') return
    botRef.current = setInterval(() => {
      setPlayers(prev => {
        if (prev.length < 2) return prev
        if (Math.random() < 0.3) {
          const from = prev[Math.floor(Math.random() * prev.length)]
          const targets = [...prev.filter(p => p.id !== from.id)]
          // Sometimes target the player
          if (Math.random() < 0.25) {
            const msgs = ['vibes', 'yo', 'hey', '🔥', 'lets go', 'mood', 'wild', 'bet', 'sup', 'wavy']
            const msg = msgs[Math.floor(Math.random() * msgs.length)]
            const mood = Math.floor(Math.random() * MOODS.length)
            setResData({ from, msg, mood })
            setResTimer(30)
            setShowRes(true)
            playPing(msg, mood, from.vibe_key, from.clout)
            return prev
          }
          if (targets.length > 0) {
            const to = targets[Math.floor(Math.random() * targets.length)]
            const msgs = ['vibes', 'yo', 'hey', '🔥', 'lets go', 'mood', 'sup', 'bet']
            const msg = msgs[Math.floor(Math.random() * msgs.length)]
            const mood = Math.floor(Math.random() * MOODS.length)
            addFeed(from, to, msg, mood, null)
            // Bot response
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
    }, 2500 + Math.random() * 3000)
    return () => { if (botRef.current) clearInterval(botRef.current) }
  }, [me, phase])

  // Resonance timer
  useEffect(() => {
    if (!showRes) return
    resIntervalRef.current = setInterval(() => {
      setResTimer(prev => {
        if (prev <= 1) { handleRespond('absorb'); return 30 }
        return prev - 1
      })
    }, 1000)
    return () => { if (resIntervalRef.current) clearInterval(resIntervalRef.current) }
  }, [showRes])

  // ═══ QUIZ ═══
  function handleQuizAnswer(optIndex: number) {
    const newScores = { ...qScores }
    QUIZ[qStep].opts[optIndex].ty.forEach(t => { newScores[t] = (newScores[t] || 0) + 1 })
    setQScores(newScores)
    if (qStep + 1 < QUIZ.length) {
      setQStep(qStep + 1)
    } else {
      let best = TN[0]
      TN.forEach(t => { if ((newScores[t] || 0) > (newScores[best] || 0)) best = t })
      const name = best.split(' ').map(w => w[0]).join('') + '-' + Math.random().toString(36).slice(2, 6)
      localStorage.setItem('vc14_vibe_type', best)
      localStorage.setItem('vc14_name', name)
      // Also save in legacy format for VibesHereNow compatibility
      localStorage.setItem('vibe_key', VT[best].key)
      localStorage.setItem('vibe_name', best)
      localStorage.setItem('vibe_emoji', VT[best].em)
      localStorage.setItem('vibe_username', name)
      initPlayer(best, name)
    }
  }

  async function initPlayer(vibeType: string, name: string) {
    const v = VT[vibeType]
    const spot = nearestSpot
    const player: Player = {
      id: 'local_' + Math.random().toString(36).slice(2, 10),
      name, vibe_key: vibeType, clout: 0,
      spot_id: spot?.id || '', lat: userLocation?.lat || spot?.latitude || 34.05,
      lng: userLocation?.lng || spot?.longitude || -118.24,
      sent: 0, recv: 0, is_throne: false,
      last_seen: new Date().toISOString(), linked_to: [],
    }
    // Try to register in Supabase
    try {
      const { data, error } = await supabase.from('vc_players').insert({
        name, vibe_key: v.key, vibe_name: vibeType, vibe_emoji: v.em,
        lat: player.lat, lng: player.lng,
        spot_id: spot?.id || null,
        session_code: spot?.id?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'GLOBAL',
        last_seen: new Date().toISOString(), clout: 0, sent: 0, recv: 0, is_throne: false,
      }).select('id').single()
      if (data) player.id = data.id
    } catch { /* use local ID */ }
    setMe(player)
    setPhase('active')
  }

  // ═══ GAME ACTIONS ═══
  function addFeed(from: Partial<Player>, to: Partial<Player>, msg: string, mood: number, resp: string | null) {
    setFeedItems(prev => [{
      t: 'ping', from: { name: from.name || '?', vibe_key: from.vibe_key || '', clout: from.clout || 0 },
      to: { name: to.name || '?', vibe_key: to.vibe_key || '' },
      msg, mood, resp, time: Date.now()
    }, ...prev].slice(0, 40))
  }

  function addEvent(text: string, cls: string) {
    setFeedItems(prev => [{ t: 'event', text, cls, time: Date.now() }, ...prev].slice(0, 40))
  }

  function handleRespond(action: string) {
    if (resIntervalRef.current) clearInterval(resIntervalRef.current)
    setShowRes(false)
    if (!resData || !me) return
    const { from, msg, mood } = resData
    const cb = vibeCombo(from.vibe_key, me.vibe_key)
    const cm = comboMult(cb)
    const rm = rankMult(from.clout)
    const wm = waveActive ? 2 : 1
    let base = Math.round(rm * cm * wm)

    if (action === 'echo') {
      playEcho(msg, mood, from.vibe_key, me.vibe_key)
      addFeed(from, me, msg, mood, 'echo')
      addEvent(`✨ ECHOED ${from.name}! +${base} Clout`, '')
    } else if (action === 'distort') {
      playDistort(msg, mood)
      addFeed(from, me, msg, mood, 'distort')
      addEvent(`💀 DISTORTED ${from.name}'s ping.`, '')
    } else {
      base = Math.round(base * 0.5)
      addFeed(from, me, msg, mood, 'absorb')
    }
    setMe(prev => prev ? { ...prev, clout: prev.clout + base, recv: prev.recv + 1 } : prev)
    setResData(null)
  }

  function handleSendPing() {
    if (!compTarget || !compText.trim() || !me) return
    playPing(compText, compMood, me.vibe_key, me.clout)
    const cb = vibeCombo(me.vibe_key, compTarget.vibe_key)
    const cm = comboMult(cb)
    const cg = Math.round(rankMult(me.clout) * cm * (waveActive ? 2 : 1))
    addFeed(me, compTarget, compText, compMood, null)
    setMe(prev => prev ? { ...prev, sent: prev.sent + 1 } : prev)

    // Simulated response
    const target = compTarget
    setTimeout(() => {
      const r = Math.random()
      if (r < 0.45) {
        const kb = Math.round(cg * 0.3)
        playEcho(compText, compMood, me.vibe_key, target.vibe_key)
        addFeed(target, me, compText, compMood, 'echo')
        addEvent(`✨ ${target.name} ECHOED! +${kb} Kickback`, '')
        setMe(prev => prev ? { ...prev, clout: prev.clout + kb } : prev)
      } else if (r < 0.65) {
        playDistort(compText, compMood)
        addFeed(target, me, compText, compMood, 'distort')
        addEvent(`💀 ${target.name} DISTORTED your ping.`, '')
      } else {
        addFeed(target, me, compText, compMood, 'absorb')
      }
    }, 1200 + Math.random() * 2500)

    setShowComposer(false); setCompText(''); setCompTarget(null)
  }

  // ═══ RENDER ═══
  if (phase === 'quiz') {
    const q = QUIZ[qStep]
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs text-white/40">VIBE CHECK V14</span>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {QUIZ.map((_, i) => (
            <div key={i} className={`flex-1 h-[3px] rounded-full ${i < qStep ? 'bg-[#ff3366]' : i === qStep ? 'bg-[#7b61ff]' : 'bg-white/10'}`} />
          ))}
        </div>
        <h2 className="text-xl font-bold text-white mb-6 leading-tight">{q.q}</h2>
        <div className="flex flex-col gap-3">
          {q.opts.map((opt, i) => (
            <button key={i} onClick={() => handleQuizAnswer(i)}
              className="p-4 bg-white/5 border border-white/10 rounded-xl text-white text-left text-sm hover:border-[#7b61ff]/50 active:scale-[0.98] transition">
              {opt.t}
            </button>
          ))}
        </div>
        {nearestSpot && (
          <div className="mt-auto pt-6 text-center">
            <p className="text-white/30 text-xs font-mono">NEAREST SPOT: {nearestSpot.name}</p>
          </div>
        )}
      </div>
    )
  }

  // ═══ ACTIVE PHASE ═══
  if (!me) return null
  const myVibe = VT[me.vibe_key] || VT['SIGNAL BOOST']
  const myRank = getRank(me.clout)
  const throne = [...players, me].sort((a, b) => b.clout - a.clout)[0]

  return (
    <div className="fixed inset-0 z-30 pointer-events-none" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* RADAR CANVAS — covers map, renders sweep line + player dots */}
      <RadarCanvas players={players} me={me} nearestSpot={nearestSpot} waveActive={waveActive} onPlayerClick={(p) => { setCompTarget(p); setShowComposer(true) }} />

      {/* VC STATUS BAR — compact, top-left under existing UI */}
      <div className="pointer-events-auto absolute top-[140px] left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0a0f]/80 backdrop-blur-md rounded-full border border-white/10 z-20">
        <span className="font-mono text-[10px] font-bold bg-gradient-to-r from-[#ff3366] to-[#7b61ff] bg-clip-text text-transparent">VC</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-white/8 rounded" style={{ color: myRank.c }}>{myRank.em} {myRank.n}</span>
        {waveActive && <span className="font-mono text-[8px] px-1.5 py-0.5 bg-gradient-to-r from-[#ff3366] to-[#7b61ff] rounded text-white font-bold animate-pulse">⚡</span>}
        {throne?.id === me.id && <span className="text-xs">👑</span>}
        <span className="font-mono text-[10px] font-bold text-[#ffd700]">{me.clout}</span>
        <button onClick={onClose} className="text-white/30 hover:text-white text-[10px] ml-0.5">✕</button>
      </div>

      {/* LIVE CHAT — top-right corner, compact */}
      <div className="pointer-events-none absolute top-[100px] right-2 w-[220px] max-h-[35vh] overflow-y-auto flex flex-col justify-end z-10"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)' }}>
        {feedItems.slice(0, 6).reverse().map((item, i) => {
          if (item.t === 'event') return (
            <div key={i} className={`pointer-events-auto px-2 py-1 mb-0.5 rounded text-center font-mono text-[8px] bg-[#0a0a0f]/70 backdrop-blur-sm ${
              item.cls === 'throne-ev' ? 'text-[#ffd700]' :
              item.cls === 'wave-ev' ? 'text-[#ff3366]' :
              item.cls === 'rank-ev' ? 'text-[#7b61ff]' : 'text-white/40'
            }`}>{item.text}</div>
          )
          const fv = VT[item.from?.vibe_key || ''] || {}
          const tv = VT[item.to?.vibe_key || ''] || {}
          const rc = item.resp || ''
          return (
            <div key={i} className={`pointer-events-auto px-2 py-1 mb-0.5 rounded bg-[#0a0a0f]/70 backdrop-blur-sm border ${
              rc === 'echo' ? 'border-[#00ffaa]/20' :
              rc === 'distort' ? 'border-[#ff3366]/20' :
              rc === 'absorb' ? 'border-white/5 opacity-35' : 'border-white/5'
            }`} style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-[9px]" style={{ color: (fv as any).c || '#fff' }}>{item.from?.name}</span>
                <span className="text-white/20 text-[7px]">→</span>
                <span className="font-semibold text-[9px]" style={{ color: (tv as any).c || '#fff' }}>{item.to?.name}</span>
                {rc === 'echo' && <span className="ml-auto font-mono text-[7px] px-1 rounded bg-[#00ffaa]/20 text-[#00ffaa]">ECHO</span>}
                {rc === 'distort' && <span className="ml-auto font-mono text-[7px] px-1 rounded bg-[#ff3366]/20 text-[#ff3366]">DISTORT</span>}
              </div>
              <div className="font-mono text-[8px] text-white/50 truncate">"{item.msg}"</div>
            </div>
          )
        })}
      </div>

      {/* BOTTOM BUTTONS — Nearby + Profile, compact pills */}
      <div className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <button onClick={() => { setShowNearby(!showNearby); setShowProfile(false) }}
          className={`px-4 py-2 rounded-full text-[11px] font-semibold backdrop-blur-md border transition ${showNearby ? 'bg-[#ff3366]/20 border-[#ff3366]/40 text-[#ff3366]' : 'bg-[#0a0a0f]/80 border-white/10 text-white/60'}`}>
          👥 Nearby
        </button>
        <button onClick={() => { setShowProfile(!showProfile); setShowNearby(false) }}
          className={`px-4 py-2 rounded-full text-[11px] font-semibold backdrop-blur-md border transition ${showProfile ? 'bg-[#ff3366]/20 border-[#ff3366]/40 text-[#ff3366]' : 'bg-[#0a0a0f]/80 border-white/10 text-white/60'}`}>
          👤 Profile
        </button>
      </div>

      {/* NEARBY PANEL */}
      {showNearby && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNearby(false)} />
          <div className="relative bg-[#12121a] rounded-t-2xl max-h-[70vh] overflow-y-auto p-4" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-3" />
            <p className="font-mono text-[10px] text-white/40 tracking-widest text-center mb-3">NEARBY — {nearestSpot?.name || 'GLOBAL'}</p>
            {players.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Nobody here yet. You are the Pioneer 🏔️</p>
            ) : players.sort((a, b) => b.clout - a.clout).map(pl => {
              const v = VT[pl.vibe_key] || {}; const rk = getRank(pl.clout)
              const cb = vibeCombo(me.vibe_key, pl.vibe_key)
              return (
                <div key={pl.id} onClick={() => { setCompTarget(pl); setShowComposer(true); setShowNearby(false) }}
                  className={`flex items-center gap-3 p-3 bg-white/5 border rounded-xl mb-2 cursor-pointer active:scale-[0.98] transition ${
                    pl.id === throne?.id ? 'border-[#ffd700]/40' : 'border-white/5'
                  }`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: (v as any).c || '#555', opacity: Math.max(0.3, Math.min(1, pl.clout / 50 + 0.3)) }}>
                    {pl.id === throne?.id ? '👑' : (v as any).em || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{pl.name}</p>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                      <span>{rk.em} {rk.n}</span>
                      {cb === 'strong' && <span className="px-1.5 py-0.5 rounded bg-[#00ffaa]/15 text-[#00ffaa] text-[9px] font-bold">2×</span>}
                      {cb === 'weak' && <span className="px-1.5 py-0.5 rounded bg-[#ff3366]/15 text-[#ff3366] text-[9px] font-bold">0.5×</span>}
                      {cb === 'same' && <span className="px-1.5 py-0.5 rounded bg-[#7b61ff]/15 text-[#7b61ff] text-[9px] font-bold">1.5×</span>}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: rk.c }}>{pl.clout}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* PROFILE PANEL */}
      {showProfile && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="relative bg-[#12121a] rounded-t-2xl max-h-[70vh] overflow-y-auto p-4" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-3" />
            <div className="text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl border-2" style={{ borderColor: myVibe.c, background: myVibe.c + '20' }}>
                {me.id === throne?.id ? '👑' : myVibe.em}
              </div>
              <p className="font-bold text-white mt-2">{me.name}</p>
              <p className="font-mono text-xs mt-0.5" style={{ color: myVibe.c }}>{myVibe.em} {me.vibe_key}</p>
              <p className="font-mono text-xs mt-1 px-3 py-1 bg-white/5 rounded-lg inline-block" style={{ color: myRank.c }}>{myRank.em} {myRank.n} — {me.clout} CLOUT</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/5 rounded-lg p-2 text-center"><p className="font-mono text-sm font-bold text-white">{me.recv}</p><p className="text-[9px] text-white/40 uppercase">Received</p></div>
                <div className="bg-white/5 rounded-lg p-2 text-center"><p className="font-mono text-sm font-bold text-white">{me.sent}</p><p className="text-[9px] text-white/40 uppercase">Sent</p></div>
                <div className="bg-white/5 rounded-lg p-2 text-center"><p className="font-mono text-sm font-bold text-white">{me.linked_to.length}</p><p className="text-[9px] text-white/40 uppercase">Links</p></div>
              </div>
              <div className="mt-4 text-left">
                <p className="font-mono text-[10px] text-white/40 tracking-widest mb-2">VIBE MATCHUPS</p>
                {TN.map(t => {
                  const cb = vibeCombo(me.vibe_key, t)
                  const cc = cb === 'strong' ? '#00ffaa' : cb === 'weak' ? '#ff3366' : cb === 'same' ? '#7b61ff' : '#6b6880'
                  const lb = cb === 'strong' ? '2× BOOST' : cb === 'weak' ? '0.5× WEAK' : cb === 'same' ? '1.5× SAME' : '1× NEUTRAL'
                  return (
                    <div key={t} className="flex items-center gap-2 py-1 text-xs">
                      <span style={{ color: VT[t].c }}>{VT[t].em}</span>
                      <span className="flex-1 text-white/60 text-[11px]">{t}</span>
                      <span className="font-mono text-[9px]" style={{ color: cc }}>{lb}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSER */}
      {showComposer && compTarget && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex flex-col justify-end">
          <div className="bg-[#12121a] rounded-t-2xl p-5" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white">Compose Ping</span>
              <button onClick={() => { setShowComposer(false); setCompTarget(null) }} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">×</button>
            </div>
            <p className="font-mono text-[10px] text-white/40 mb-3">
              → <span style={{ color: (VT[compTarget.vibe_key] as any)?.c }}>{compTarget.name}</span> • {(VT[compTarget.vibe_key] as any)?.em} {compTarget.vibe_key}
              {vibeCombo(me.vibe_key, compTarget.vibe_key) === 'strong' && <span className="text-[#00ffaa] ml-1">• 2× BOOST</span>}
              {vibeCombo(me.vibe_key, compTarget.vibe_key) === 'weak' && <span className="text-[#ff3366] ml-1">• 0.5× WEAK</span>}
              {vibeCombo(me.vibe_key, compTarget.vibe_key) === 'same' && <span className="text-[#7b61ff] ml-1">• 1.5× SAME</span>}
            </p>
            <input value={compText} onChange={e => setCompText(e.target.value.slice(0, 20))} maxLength={20}
              placeholder="say something (20 chars)" autoFocus
              className="w-full p-3 bg-[#0a0a0f] border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#7b61ff] mb-1" />
            <p className="text-right font-mono text-[9px] text-white/30 mb-3">{compText.length}/20</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {MOODS.map((m, i) => (
                <button key={i} onClick={() => { setCompMood(i); if (compText) playPing(compText, i, me.vibe_key, me.clout) }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${i === compMood ? 'border-[#ff3366] bg-[#ff3366]/10 text-white' : 'border-white/10 text-white/50'}`}>
                  {m.em} {m.n}
                </button>
              ))}
            </div>
            <button onClick={handleSendPing} disabled={!compText.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#ff3366] to-[#7b61ff] rounded-xl text-white font-bold disabled:opacity-30 active:scale-[0.97] transition">
              THROW IT ⚡
            </button>
          </div>
        </div>
      )}

      {/* RESONANCE OVERLAY */}
      {showRes && resData && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-5">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center" style={{ animation: 'popIn 0.3s ease-out' }}>
            <p className="font-mono text-[10px] text-white/40 tracking-widest mb-2">
              PING FROM <span style={{ color: (VT[resData.from.vibe_key] as any)?.c }}>{resData.from.name}</span>
            </p>
            <p className="font-mono text-lg font-bold text-white mb-1">"{resData.msg}"</p>
            <p className="text-sm text-white/50 mb-4">{MOODS[resData.mood]?.em} {MOODS[resData.mood]?.n}</p>
            <p className="font-mono text-4xl font-bold mb-5" style={{ color: resTimer <= 10 ? '#ff3366' : '#00ffaa' }}>{resTimer}</p>
            <div className="flex gap-2">
              <button onClick={() => handleRespond('echo')} className="flex-1 py-3 bg-[#00ffaa] rounded-xl text-[#0a0a0f] font-bold active:scale-95 transition">ECHO</button>
              <button onClick={() => handleRespond('distort')} className="flex-1 py-3 bg-[#ff3366] rounded-xl text-white font-bold active:scale-95 transition">DISTORT</button>
              <button onClick={() => handleRespond('absorb')} className="flex-1 py-3 bg-white/10 rounded-xl text-white/50 font-bold active:scale-95 transition">ABSORB</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL STYLES */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}
