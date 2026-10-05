# AI Audio Tool

A Cloudflare Worker that provides speech-to-text (Whisper) and text-to-speech (MeloTTS) in a single tool.

## Features

- Speech to text: upload audio, get transcript
- Text to speech: enter text, generate MP3
- Multi-language TTS support
- Runs on Cloudflare Workers AI — no API keys
- Built-in rate limiting (30 requests/min per IP)
- Audio is not stored
- Multi-language interface (EN + ZH)

## Setup

```bash
npm install
npx wrangler deploy
```

## Routes

Add to `tool-proxy`:
- `toolara.dev/ai-audio-tool/*`
- `www.toolara.dev/ai-audio-tool/*`

## License

MIT
