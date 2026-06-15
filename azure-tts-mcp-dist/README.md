# azure-tts-mcp

Ein MCP-Server, der Text-to-Speech über Microsoft Azure Neural TTS bereitstellt.
Erster Anwendungsfall: spanische neuronale Sprache erzeugen.

Der Server stellt ein Tool bereit: **`speak_spanish`** — synthetisiert spanischen
Text in eine Audiodatei und gibt den Dateipfad zurück.

## Voraussetzungen

- Node.js 18 oder neuer
- Ein Azure-Account mit einer **Speech**-Ressource (Cognitive Services / Azure AI
  Speech). Daraus brauchst du:
  - einen **Key** (`AZURE_SPEECH_KEY`)
  - die **Region** der Ressource (`AZURE_SPEECH_REGION`), z. B. `westeurope` oder
    `germanywestcentral`

Die Region ist *nicht* frei wählbar — es muss die Region sein, in der deine
Speech-Ressource liegt. Du findest beides im Azure-Portal unter deiner
Speech-Ressource → "Keys and Endpoint".

## Installation

```bash
npm install
```

Das war's. Es gibt keinen Build-Schritt — der Server läuft direkt als `index.js`.

## Claude Desktop einrichten

Bearbeite die Claude-Desktop-Konfigurationsdatei:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Füge den Server hinzu (siehe auch `claude_desktop_config.example.json`):

```json
{
  "mcpServers": {
    "azure-tts": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/zu/azure-tts-mcp/index.js"],
      "env": {
        "AZURE_SPEECH_KEY": "DEIN_AZURE_SPEECH_KEY",
        "AZURE_SPEECH_REGION": "westeurope"
      }
    }
  }
}
```

Wichtig:
- `args` muss der **absolute Pfad** zur `index.js` dieses Projekts sein.
- Falls in der Config bereits ein `mcpServers`-Block existiert, füge nur den
  `"azure-tts"`-Eintrag dort hinzu.
- Danach Claude Desktop **vollständig neu starten**.

Optional kannst du im `env`-Block `TTS_OUTPUT_DIR` setzen, um das Ausgabe-
verzeichnis festzulegen. Standard ist der Ordner `output/` im Projektverzeichnis.

## Benutzung

In Claude Desktop kannst du dann z. B. schreiben:

> Erzeuge mit dem azure-tts-Tool Sprache aus: "Hola, ¿cómo estás hoy?"

Claude ruft das Tool auf, die Datei wird geschrieben, und du bekommst den Pfad
zur erzeugten Audiodatei zurück.

## Tool-Parameter (`speak_spanish`)

| Parameter    | Pflicht | Beschreibung |
|--------------|---------|--------------|
| `text`       | ja      | Der spanische Text. |
| `voice`      | nein    | Eine spanische Neural-Stimme. Standard: `es-ES-ElviraNeural`. |
| `format`     | nein    | `mp3` (Standard) oder `wav`. |
| `outputPath` | nein    | Absoluter Zielpfad. Ohne Angabe: Zeitstempel-Datei im Ausgabeverzeichnis. |

### Verfügbare spanische Stimmen (Auswahl)

- Spanien: `es-ES-ElviraNeural` (w), `es-ES-AlvaroNeural` (m), `es-ES-XimenaNeural` (w)
- Mexiko: `es-MX-DaliaNeural` (w), `es-MX-JorgeNeural` (m)
- Argentinien: `es-AR-ElenaNeural` (w), `es-AR-TomasNeural` (m)
- Kolumbien: `es-CO-SalomeNeural` (w), `es-CO-GonzaloNeural` (m)
- USA: `es-US-PalomaNeural` (w), `es-US-AlonsoNeural` (m)

Die vollständige, aktuelle Stimmenliste: https://aka.ms/speech/tts-languages

## Schneller Selbsttest (optional, ohne Claude)

```bash
cp .env.example .env   # Key + Region eintragen
node -e "import('dotenv/config')" 2>/dev/null; \
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope node test.js
```

> Hinweis: Dieses Repo enthält kein `test.js` — am einfachsten testest du direkt
> über Claude Desktop. Der MCP-Handshake selbst wurde verifiziert.

## Fehlersuche

- **"Azure credentials are not configured"** → `AZURE_SPEECH_KEY` /
  `AZURE_SPEECH_REGION` fehlen im `env`-Block der Config.
- **Synthesis canceled / 401 / 403** → falscher Key oder falsche Region.
- **Server taucht in Claude nicht auf** → Pfad in `args` prüfen (absolut!),
  Claude Desktop neu starten, Logs prüfen (macOS:
  `~/Library/Logs/Claude/`).
