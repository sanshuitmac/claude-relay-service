#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const readline = require('readline')
const { execFileSync } = require('child_process')

const DEFAULT_BASE_URL = 'https://codex.funai.vip/openai'
const VERIFY_API_URL = 'https://codex.funai.vip/apiStats/api/get-key-id'
const DEFAULT_MODEL = 'gpt-5.3-codex'
const DEFAULT_REASONING = 'high'
const ENV_KEY = 'CRS_OAI_KEY'

const KNOWN_FLAGS = new Set([
  '--api-key',
  '-k',
  '--model',
  '-m',
  '--reasoning',
  '-r',
  '--scope',
  '--shell-file',
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
  console.log('  node setup-codex-client.js')
  console.log('  node setup-codex-client.js --api-key <cr_xxx> [options]')
  console.log('')
  console.log('Options:')
  console.log('  --api-key, -k     API key (if omitted, prompt input is used)')
  console.log(`  base_url          Fixed: ${DEFAULT_BASE_URL}`)
  console.log(`  verify_api        Fixed: ${VERIFY_API_URL}`)
  console.log(`  --model, -m       Model (default: ${DEFAULT_MODEL})`)
  console.log(`  --reasoning, -r   Reasoning effort (default: ${DEFAULT_REASONING})`)
  console.log('  --scope           Windows env scope: user|machine (default: user)')
  console.log('  --shell-file      macOS/Linux shell rc file override')
  console.log('  --skip-verify     Skip verify API call (not recommended)')
  console.log('  --dry-run         Print actions only, no file writes')
  console.log('  --no-backup       Do not backup existing files')
  console.log('  --help, -h        Show help')
  console.log('')
  console.log('Examples:')
  console.log('  node setup-codex-client.js')
  console.log('  node setup-codex-client.js -k cr_xxxxxxxxxx')
}

function parseOptions(argv) {
  const options = {
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
    verifyApiUrl: VERIFY_API_URL,
    model: process.env.CRS_MODEL || DEFAULT_MODEL,
    reasoning: process.env.CRS_REASONING || DEFAULT_REASONING,
    scope: 'user',
    shellFile: '',
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

    if (arg === '--model' || arg === '-m') {
      assignValue('model', argv[index + 1], arg)
      index += 1
      continue
    }

    if (arg === '--reasoning' || arg === '-r') {
      assignValue('reasoning', argv[index + 1], arg)
      index += 1
      continue
    }

    if (arg === '--scope') {
      assignValue('scope', argv[index + 1], arg)
      index += 1
      continue
    }

    if (arg === '--shell-file') {
      assignValue('shellFile', argv[index + 1], arg)
      index += 1
      continue
    }

    if (arg.startsWith('--api-key=')) {
      options.apiKey = arg.slice('--api-key='.length)
      continue
    }

    if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length)
      continue
    }

    if (arg.startsWith('--reasoning=')) {
      options.reasoning = arg.slice('--reasoning='.length)
      continue
    }

    if (arg.startsWith('--scope=')) {
      options.scope = arg.slice('--scope='.length)
      continue
    }

    if (arg.startsWith('--shell-file=')) {
      options.shellFile = arg.slice('--shell-file='.length)
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

  options.scope = String(options.scope || '').toLowerCase()
  return options
}

function ensureValidOptions(options) {
  if (options.help) {
    return
  }

  if (options.scope !== 'user' && options.scope !== 'machine') {
    failAndExit('--scope must be user or machine')
  }
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

function resolveHomePath(inputPath) {
  if (!inputPath) {
    return ''
  }

  if (inputPath === '~') {
    return os.homedir()
  }

  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2))
  }

  return path.resolve(inputPath)
}

function detectShellRcPath(options) {
  if (options.shellFile) {
    return resolveHomePath(options.shellFile)
  }

  const shellName = path.basename(process.env.SHELL || '')
  if (shellName.includes('zsh')) {
    return path.join(os.homedir(), '.zshrc')
  }

  if (shellName.includes('bash')) {
    return path.join(os.homedir(), '.bashrc')
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), '.zshrc')
  }

  return path.join(os.homedir(), '.bashrc')
}

function escapeDoubleQuotes(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function updateShellExport(shellFilePath, apiKey, options) {
  const exportLine = `export ${ENV_KEY}="${escapeDoubleQuotes(apiKey)}"`

  let oldContent = ''
  if (fs.existsSync(shellFilePath)) {
    oldContent = fs.readFileSync(shellFilePath, 'utf8')
  }

  const filteredLines = oldContent
    .split(/\r?\n/)
    .filter((line) => !/^\s*export\s+CRS_OAI_KEY\s*=/.test(line))

  while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
    filteredLines.pop()
  }

  const nextContent = [...filteredLines, exportLine, ''].join('\n')

  if (options.dryRun) {
    log(`(dry-run) Update env file: ${shellFilePath}`)
    return
  }

  fs.mkdirSync(path.dirname(shellFilePath), { recursive: true })
  fs.writeFileSync(shellFilePath, nextContent, 'utf8')
  log(`Updated env file: ${shellFilePath}`)
}

function setWindowsEnv(apiKey, options) {
  const target = options.scope === 'machine' ? 'Machine' : 'User'
  const escapedApiKey = apiKey.replace(/'/g, "''")
  const command = `[System.Environment]::SetEnvironmentVariable('${ENV_KEY}', '${escapedApiKey}', [System.EnvironmentVariableTarget]::${target})`

  if (options.dryRun) {
    log(`(dry-run) Set Windows ${target} env: ${ENV_KEY}`)
    return
  }

  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      stdio: 'ignore'
    })
    log(`Set Windows ${target} env: ${ENV_KEY}`)
  } catch (error) {
    if (target === 'Machine') {
      failAndExit('Set machine env failed (admin permission may be required). Try --scope user')
    }
    failAndExit(`Set Windows env failed: ${error.message}`)
  }
}

function buildConfigToml(options) {
  return [
    'model_provider = "crs"',
    `model = "${options.model}"`,
    `model_reasoning_effort = "${options.reasoning}"`,
    'disable_response_storage = true',
    'preferred_auth_method = "apikey"',
    '',
    '[model_providers.crs]',
    'name = "crs"',
    `base_url = "${options.baseUrl}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true',
    'env_key = "CRS_OAI_KEY"',
    ''
  ].join('\n')
}

function buildAuthJson() {
  return '{\n  "OPENAI_API_KEY": null\n}\n'
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  ensureValidOptions(options)

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

  writeTextFile(configPath, buildConfigToml(options), options)
  writeTextFile(authPath, buildAuthJson(), options)

  if (process.platform === 'win32') {
    setWindowsEnv(apiKey, options)
  } else {
    const shellRcPath = detectShellRcPath(options)
    updateShellExport(shellRcPath, apiKey, options)
    log(`Run this command now: source ${shellRcPath}`)
  }

  if (!options.dryRun) {
    log('Done: Codex config and environment variable are set')
    if (process.platform === 'win32') {
      log('Please reopen terminal or restart VSCode, then run codex')
    } else {
      log('Please reopen terminal, then run codex')
    }
  }
}

main().catch((error) => {
  console.error(`[codex-setup] ${error.message}`)
  process.exitCode = 1
})
