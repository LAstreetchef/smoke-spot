# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## Gmail
- **Account:** kammiceli@gmail.com
- **Access:** IMAP via app password
- **Credentials:** `~/.clawdbot/credentials/gmail.json`
- **Notes:** 207k+ messages in inbox. Use targeted searches to avoid timeouts.

## WhatsApp
- **Kam's number:** +13109481919
- **Status:** Check with `clawdbot channels status`

### Contacts
| Name | Number |
|------|--------|
| Mimi Riley | +1-310-779-2505 |
| Julien Miceli | +1-424-832-0294 |
| Mitchell Collier | +1-310-779-6769 |

## GitHub
- **Account:** LAstreetchef
- **Token:** `~/.config/github/token` (PAT stored securely)
- **Repos:** https://github.com/LAstreetchef

## FlyWheel (Local Dev)
- **Workspace:** `~/clawd/fly-wheel/`
- **Start server:** `cd ~/clawd/fly-wheel && node server.js`
- **Port:** 3001
- **Ngrok domain:** `blearier-ashlee-unextravasated.ngrok-free.dev`
- **Start ngrok:** `ngrok http 3001 --domain=blearier-ashlee-unextravasated.ngrok-free.dev`
- **Frontend:** https://lastreetchef.github.io/fly-wheel/
- **Health check:** `curl -s https://blearier-ashlee-unextravasated.ngrok-free.dev/api/health`

## Voice (TTS)
- **Provider:** ElevenLabs (always on)
- **Preferred voice:** *(add preference)*
- **When to use:** Stories, summaries, long content

## Twitter/X (FlyWheel)
- **App:** flywheelsqu
- **Client ID:** NHkxRVMzam1PenkzU3pHYUxSVUo6MTpjaQ
- **Callback:** `https://blearier-ashlee-unextravasated.ngrok-free.dev/api/twitter/callback`

---

## What Else Goes Here
- Camera names and locations
- SSH hosts and aliases
- Speaker/room names
- Device nicknames
- Anything environment-specific

---

*Add whatever helps you do your job. This is your cheat sheet.*
