#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const readline = require('readline')

const VERIFY_API_URL = 'https://codex.funai.vip/apiStats/api/get-key-id'

const CONFIG_TOML_CONTENT = [
  'model_provider = "crs"',
  'model = "gpt-5.3-codex"',
  'model_reasoning_effort = "high"',
  'disable_response_storage = true',
  'preferred_auth_method = "apikey"',
  '',
  '[model_providers.crs]',
  'name = "crs"',
  'base_url = "https://codex.funai.vip/openai"',
  'wire_api = "responses"',
  'requires_openai_auth = true',
  ''
].join('\n')

const KNOWN_FLAGS = new Set([
  '--api-key',
  '-k',
  '--skip-verify',
  '--dry-run',
  '--no-backup',
  '--help',
  '-h'
])

function log(message) {
  console.log(`[codex-setup] ${message}`)
}

function failAndExit(message) {
  throw new Error(message)
}

function showHelp() {
  console.log('Usage:')
  console.log('  node setup_codex.js')
  console.log('  node setup_codex.js --api-key <cr_xxx> [options]')
  console.log('')
  console.log('Options:')
  console.log('  --api-key, -k     API key (if omitted, prompt input is used)')
  console.log(`  verify_api        Fixed: ${VERIFY_API_URL}`)
  console.log('  --skip-verify     Skip verify API call (not recommended)')
  console.log('  --dry-run         Print actions only, no file writes')
  console.log('  --no-backup       Do not backup existing files')
  console.log('  --help, -h        Show help')
  console.log('')
  console.log('This script writes:')
  console.log('  ~/.codex/config.toml')
  console.log('  ~/.codex/auth.json')
}

function parseOptions(argv) {
  const options = {
    apiKey: '',
    verifyApiUrl: VERIFY_API_URL,
    skipVerify: false,
    dryRun: false,
    noBackup: false,
    help: false
  }

  const positional = []

  const assignValue = (key, value, flagName) => {
    if (!value || value.startsWith('-')) {
      failAndExit(`Argument ${flagName} requires a value`)
    }
    options[key] = value
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--no-backup') {
      options.noBackup = true
      continue
    }

    if (arg === '--skip-verify') {
      options.skipVerify = true
      continue
    }

    if (arg === '--api-key' || arg === '-k') {
      assignValue('apiKey', argv[index + 1], arg)
      index += 1
      continue
    }

    if (arg.startsWith('--api-key=')) {
      options.apiKey = arg.slice('--api-key='.length)
      continue
    }

    if (arg.startsWith('-')) {
      if (!KNOWN_FLAGS.has(arg)) {
        failAndExit(`Unknown option: ${arg}`)
      }
      continue
    }

    positional.push(arg)
  }

  if (!options.apiKey && positional[0]) {
    options.apiKey = positional[0]
  }

  return options
}

function askApiKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question('请输入 API Key（cr_xxxxxxxxxx）: ', (answer) => {
      rl.close()
      resolve(String(answer || '').trim())
    })
  })
}

async function verifyApiKey(apiKey, options) {
  if (options.skipVerify) {
    log('Skip verify enabled, API validation is skipped')
    return
  }

  if (options.dryRun) {
    log(`(dry-run) Verify API key via: ${options.verifyApiUrl}`)
    return
  }

  log('Verifying API key...')
  const response = await fetch(options.verifyApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey })
  })

  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    payload = null
  }

  if (!response.ok) {
    const serverMessage = payload?.message || payload?.error || `HTTP ${response.status}`
    failAndExit(`API key verify failed: ${serverMessage}`)
  }

  if (!payload || payload.success !== true) {
    failAndExit('API key verify failed: response.success is not true')
  }

  log('API key verification passed')
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function buildTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
}

function ensureCodexDir(codexDir, options) {
  if (options.dryRun) {
    log(`(dry-run) Create directory: ${codexDir}`)
    return
  }

  fs.mkdirSync(codexDir, { recursive: true })
}

function backupFile(filePath, options) {
  if (options.noBackup || !fs.existsSync(filePath)) {
    return
  }

  const backupPath = `${filePath}.bak-${buildTimestamp()}`
  if (options.dryRun) {
    log(`(dry-run) Backup: ${filePath} -> ${backupPath}`)
    return
  }

  fs.copyFileSync(filePath, backupPath)
  log(`Backed up: ${backupPath}`)
}

function writeTextFile(filePath, content, options) {
  if (options.dryRun) {
    log(`(dry-run) Write file: ${filePath}`)
    return
  }

  fs.writeFileSync(filePath, content, 'utf8')
  log(`Wrote: ${filePath}`)
}

function buildAuthJson(apiKey) {
  return `${JSON.stringify({ OPENAI_API_KEY: apiKey })}\n`
}

async function main() {
  const options = parseOptions(process.argv.slice(2))

  if (options.help) {
    showHelp()
    return
  }

  let apiKey = String(options.apiKey || '').trim()
  if (!apiKey) {
    apiKey = await askApiKey()
  }

  if (!apiKey) {
    failAndExit('API key is required')
  }

  if (!apiKey.startsWith('cr_')) {
    log('Warning: API key does not start with cr_, please double-check')
  }

  await verifyApiKey(apiKey, options)

  const codexDir = path.join(os.homedir(), '.codex')
  const configPath = path.join(codexDir, 'config.toml')
  const authPath = path.join(codexDir, 'auth.json')

  ensureCodexDir(codexDir, options)
  backupFile(configPath, options)
  backupFile(authPath, options)

  writeTextFile(configPath, CONFIG_TOML_CONTENT, options)
  writeTextFile(authPath, buildAuthJson(apiKey), options)

  if (!options.dryRun) {
    log('Done: Codex config files have been written')
    log('Please reopen terminal or restart VSCode, then run codex')
  }
}

main().catch((error) => {
  console.error(`[codex-setup] ${error.message}`)
  process.exitCode = 1
})
