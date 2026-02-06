# HEARTBEAT.md

## Every Heartbeat
- [ ] Run `clawdbot channels status` — alert if WhatsApp disconnected

## Rotating Checks (pick 1-2 per heartbeat)

### FlyWheel Server (if recently active)
- [ ] Check if node server running: `ps aux | grep "node server.js" | grep -v grep`
- [ ] Check ngrok tunnel: `curl -s https://blearier-ashlee-unextravasated.ngrok-free.dev/api/health`
- [ ] If down and Kam was using it recently, offer to restart

### Email (every 4-6 hours during waking hours)
- [ ] Check for urgent unread emails
- [ ] Only alert if something looks important

### Memory Maintenance (once per day)
- [ ] Review today's memory file for completeness
- [ ] Update MEMORY.md if significant events occurred

## State Tracking
Track last check times in `memory/heartbeat-state.json` to avoid over-checking.

## Quiet Hours
- 23:00 - 08:00 CST: Only alert for urgent issues
- Respect if Kam seems busy or AFK
