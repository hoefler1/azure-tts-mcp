# azure-tts-mcp

An MCP server that provides text-to-speech via Microsoft Azure Neural TTS.
It exposes two tools — **`speak_spanish`** and **`speak_thai`** — that synthesize
text into an audio file and return the path to the written file.

## Features

- Spanish and Thai neural voices, with a curated list of voices per language.
- Optional speaking-rate control via Azure prosody (`rate`).
- MP3 or WAV output.
- Text is XML-escaped before being embedded in SSML, so arbitrary input is safe.

## Requirements

- **Node.js 23.6 or newer** (or 22.18+). The server imports a TypeScript module
  (`xmlEscaper.ts`) and relies on Node's built-in type stripping, which is enabled
  by default starting with those versions. There is no build step.
- An Azure account with a **Speech** resource (Cognitive Services / Azure AI
  Speech). From it you need:
  - a **key** (`AZURE_SPEECH_KEY`)
  - the **region** of the resource (`AZURE_SPEECH_REGION`), e.g. `westeurope` or
    `germanywestcentral`

The region is *not* freely chosen — it must be the region your Speech resource
lives in. Find both in the Azure portal under your Speech resource →
"Keys and Endpoint".

## Installation

```bash
npm install
```

That's it. There is no build step — the server runs directly as `index.js`.

## Configuration

The server is configured through environment variables:

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `AZURE_SPEECH_KEY`    | yes      | Your Azure Speech resource key. |
| `AZURE_SPEECH_REGION` | yes      | The region of that resource, e.g. `westeurope`. |
| `TTS_OUTPUT_DIR`      | no       | Directory where audio files are written. Defaults to `output/` in the project directory. |

When used via Claude Desktop, set these in the MCP config `env` block (see below).
For standalone testing you can copy `.env.example` to `.env`.

## Claude Desktop setup

Edit the Claude Desktop configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "azure-tts": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/to/azure-tts-mcp/index.js"],
      "env": {
        "AZURE_SPEECH_KEY": "YOUR_AZURE_SPEECH_KEY",
        "AZURE_SPEECH_REGION": "westeurope"
      }
    }
  }
}
```

Important:
- `args` must be the **absolute path** to this project's `index.js`.
- If a `mcpServers` block already exists, just add the `"azure-tts"` entry to it.
- Fully **restart** Claude Desktop afterwards.

Optionally set `TTS_OUTPUT_DIR` in the `env` block to control the output directory.

## Usage

In Claude Desktop you can write, for example:

> Use the azure-tts tool to generate speech from: "Hola, ¿cómo estás hoy?"

Claude calls the tool, the file is written, and you get back the path to the
generated audio file. For Thai, use the `speak_thai` tool the same way.

## Tools

Both tools (`speak_spanish` and `speak_thai`) accept the same parameters:

| Parameter    | Required | Description |
|--------------|----------|-------------|
| `text`       | yes      | The text to synthesize. |
| `voice`      | no       | A neural voice for the language. Defaults to `es-ES-ElviraNeural` (Spanish) / `th-TH-PremwadeeNeural` (Thai). |
| `format`     | no       | `mp3` (default) or `wav`. |
| `rate`       | no       | Speaking rate (Azure prosody rate). A percentage relative to the default speed, e.g. `"+20%"` (faster) or `"-30%"` (slower), or a multiplier like `"1.5"` / `"0.8"`. Omit for normal speed. |
| `outputPath` | no       | Absolute target path. If omitted, a timestamped file is written into the output directory. |

### Available Spanish voices

- Spain: `es-ES-ElviraNeural` (f), `es-ES-AlvaroNeural` (m), `es-ES-XimenaNeural` (f)
- Mexico: `es-MX-DaliaNeural` (f), `es-MX-JorgeNeural` (m)
- Argentina: `es-AR-ElenaNeural` (f), `es-AR-TomasNeural` (m)
- Colombia: `es-CO-SalomeNeural` (f), `es-CO-GonzaloNeural` (m)
- United States: `es-US-PalomaNeural` (f), `es-US-AlonsoNeural` (m)

### Available Thai voices

- `th-TH-PremwadeeNeural` (f), `th-TH-NiwatNeural` (m), `th-TH-AcharaNeural` (f)

The full, current voice list: https://aka.ms/speech/tts-languages

## Project structure

- `index.js` — MCP server entry point; registers the `speak_spanish` and
  `speak_thai` tools and handles configuration, path resolution, and output.
- `synthesize.js` — wraps the Azure Speech SDK; builds SSML (with prosody rate)
  when a rate is requested, otherwise synthesizes plain text.
- `xmlEscaper.ts` — escapes the five XML special characters so text is safe
  inside SSML.

## Troubleshooting

- **"Azure credentials are not configured"** → `AZURE_SPEECH_KEY` /
  `AZURE_SPEECH_REGION` are missing from the config `env` block.
- **Synthesis canceled / 401 / 403** → wrong key or wrong region.
- **`ERR_UNKNOWN_FILE_EXTENSION` for the `.ts` file** → your Node version is too
  old; upgrade to Node 23.6+ (or 22.18+).
- **Server doesn't show up in Claude** → check the `args` path (must be
  absolute), restart Claude Desktop, and check the logs (macOS:
  `~/Library/Logs/Claude/`).
