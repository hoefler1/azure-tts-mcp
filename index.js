#!/usr/bin/env node
/**
 * Azure Text-to-Speech MCP server
 *
 * Exposes a single tool ("speak_spanish") that synthesizes Spanish text into an
 * audio file using Microsoft Azure's neural TTS voices.
 *
 * Configuration (passed as environment variables, e.g. from the Claude Desktop
 * MCP config):
 *   AZURE_SPEECH_KEY     (required)  - your Azure Speech resource key
 *   AZURE_SPEECH_REGION  (required)  - the region of that resource, e.g. "westeurope"
 *   TTS_OUTPUT_DIR       (optional)  - where audio files are written.
 *                                      Defaults to "<this-project>/output".
 *
 * IMPORTANT for stdio MCP servers: never write to stdout. stdout carries the
 * JSON-RPC protocol stream and any stray output corrupts it. All diagnostics
 * therefore go to stderr via console.error.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Configuration ---------------------------------------------------------

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
const DEFAULT_OUTPUT_DIR =
  process.env.TTS_OUTPUT_DIR || path.join(__dirname, "output");

// A small curated set of Spanish neural voices for convenience/validation.
// The full, current list lives at https://aka.ms/speech/tts-languages
const SPANISH_VOICES = [
  // Spain (es-ES)
  "es-ES-ElviraNeural", // female
  "es-ES-AlvaroNeural", // male
  "es-ES-XimenaNeural", // female
  // Mexico (es-MX)
  "es-MX-DaliaNeural", // female
  "es-MX-JorgeNeural", // male
  // Argentina (es-AR)
  "es-AR-ElenaNeural", // female
  "es-AR-TomasNeural", // male
  // Colombia (es-CO)
  "es-CO-SalomeNeural", // female
  "es-CO-GonzaloNeural", // male
  // United States (es-US)
  "es-US-PalomaNeural", // female
  "es-US-AlonsoNeural", // male
];
const THAI_VOICES = [
  "th-TH-PremwadeeNeural",
  "th-TH-NiwatNeural",
  "th-TH-AcharaNeural"
];

const ES_DEFAULT_VOICE = "es-ES-ElviraNeural";
const TH_DEFAULT_VOICE = "th-TH-PremwadeeNeural";

// --- Core synthesis --------------------------------------------------------

import { synthesizeToFile } from "./synthesize.js";

// --- MCP server ------------------------------------------------------------

const server = new McpServer({
  name: "azure-tts-mcp",
  version: "1.0.0",
});

function doExecuteCall() {
  return async ({ text, voice, format, outputPath }) => {
      if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Azure credentials are not configured. Set AZURE_SPEECH_KEY and " +
                "AZURE_SPEECH_REGION in the MCP server environment.",
            },
          ],
        };
      }

      const chosenVoice = voice || ES_DEFAULT_VOICE;
      const chosenFormat = format || "mp3";

      // Resolve the destination path.
      let target;
      if (outputPath) {
        target = path.resolve(outputPath);
      } else {
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .replace("Z", "");
        target = path.join(
          DEFAULT_OUTPUT_DIR,
          `speech_${stamp}.${chosenFormat}`
        );
      }

      // Ensure the parent directory exists.
      const dir = path.dirname(target);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      try {
        const written = await synthesizeToFile({
          text,
          voice: chosenVoice,
          outputPath: target,
          format: chosenFormat,
        });
        return {
          content: [
            {
              type: "text",
              text: `Audio written to: ${written}\n` +
                `Voice: ${chosenVoice} | Format: ${chosenFormat}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Text-to-speech failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    };
}

server.registerTool(
  "speak_spanish",
  {
    title: "Spanish Text-to-Speech (Azure)",
    description:
      "Synthesize Spanish text into a neural-voice audio file using Microsoft " +
      "Azure Text-to-Speech. Returns the absolute path of the written file. " +
      "Default voice is es-ES-ElviraNeural.",
    inputSchema: {
      text: z
        .string()
        .min(1)
        .describe("The Spanish text to synthesize into speech."),
      voice: z
        .enum(SPANISH_VOICES)
        .optional()
        .describe(
          `Spanish neural voice to use. Defaults to ${ES_DEFAULT_VOICE}.`
        ),
      format: z
        .enum(["mp3", "wav"])
        .optional()
        .describe("Audio container. Defaults to mp3."),
      outputPath: z
        .string()
        .optional()
        .describe(
          "Absolute path for the output file. If omitted, a timestamped " +
            "file is written into the configured output directory."
        ),
    },
  },
  doExecuteCall()
);

server.registerTool(
  "speak_thai",
  {
    title: "Thai Text-to-Speech (Azure)",
    description:
      "Synthesize Thai text into a neural-voice audio file using Microsoft " +
      "Azure Text-to-Speech. Returns the absolute path of the written file. " +
      "Default voice is th-TH-PremwadeeNeural.",
    inputSchema: {
      text: z
        .string()
        .min(1)
        .describe("The Thai text to synthesize into speech."),
      voice: z
        .enum(THAI_VOICES)
        .optional()
        .describe(
          `Thai neural voice to use. Defaults to ${TH_DEFAULT_VOICE}.`
        ),
      format: z
        .enum(["mp3", "wav"])
        .optional()
        .describe("Audio container. Defaults to mp3."),
      outputPath: z
        .string()
        .optional()
        .describe(
          "Absolute path for the output file. If omitted, a timestamped " +
            "file is written into the configured output directory."
        ),
    },
  },
  doExecuteCall()
);

// --- Start -----------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("azure-tts-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting azure-tts-mcp:", err);
  process.exit(1);
});
