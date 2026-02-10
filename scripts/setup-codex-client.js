#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const DEFAULT_BASE_URL = 'https://codex.funai.vip/openai'
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
  '--dry-run',
  '--no-backup',
  '--help',
  '-h'
])

function log(message) {
  console.log(`[codex-setup] ${message}`)
}

function showHelp() {
  console.log('用法:')
  console.log('  node scripts/setup-codex-client.js --api-key <cr_xxx> [选项]')
  console.log('  node scripts/setup-codex-client.js <cr_xxx>')
  console.log('')
  console.log('选项:')
  console.log('  --api-key, -k     必填，CRS API Key（例如 cr_xxxxxxxxxx）')
  console.log(`  base_url          已固定为: ${DEFAULT_BASE_URL}`)
  console.log(`  --model, -m       模型名（默认: ${DEFAULT_MODEL}）`)
  console.log(`  --reasoning, -r   推理级别（默认: ${DEFAULT_REASONING}）`)
  console.log('  --scope           Windows 环境变量作用域: user|machine（默认: user）')
  console.log('  --shell-file      macOS/Linux 指定写入哪个 shell 配置文件')
  console.log('  --dry-run         仅打印将执行的操作，不落盘')
  console.log('  --no-backup       不备份已有 config.toml 和 auth.json')
  console.log('  --help, -h        显示帮助')
  console.log('')
  console.log('示例:')
  console.log('  node scripts/setup-codex-client.js -k cr_xxx')
  console.log('  bash scripts/setup-codex-client.sh cr_xxx')
  console.log('  powershell -ExecutionPolicy Bypass -File scripts/setup-codex-client.ps1 -k cr_xxx')
}

function parseOptions(argv) {
  const options = {
    apiKey: process.env[ENV_KEY] || '',
    baseUrl: DEFAULT_BASE_URL,
    model: process.env.CRS_MODEL || DEFAULT_MODEL,
    reasoning: process.env.CRS_REASONING || DEFAULT_REASONING,
    scope: 'user',
    shellFile: '',
    dryRun: false,
    noBackup: false,
    help: false
  }

  const positional = []

  const assignValue = (key, value, flagName) => {
    if (!value || value.startsWith('-')) {
      console.error(`[codex-setup] 参数 ${flagName} 缺少值`)
      process.exit(1)
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
        console.error(`[codex-setup] 未知参数: ${arg}`)
        process.exit(1)
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

function pad2(value) {
  return String(value).padStart(2, '0')
}

function buildTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
}

function ensureCodexDir(codexDir, options) {
  if (options.dryRun) {
    log(`(dry-run) 创建目录: ${codexDir}`)
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
    log(`(dry-run) 备份: ${filePath} -> ${backupPath}`)
    return
  }

  fs.copyFileSync(filePath, backupPath)
  log(`已备份: ${backupPath}`)
}

function writeTextFile(filePath, content, options) {
  if (options.dryRun) {
    log(`(dry-run) 写入文件: ${filePath}`)
    return
  }

  fs.writeFileSync(filePath, content, 'utf8')
  log(`已写入: ${filePath}`)
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
    log(`(dry-run) 更新环境变量文件: ${shellFilePath}`)
    return
  }

  fs.mkdirSync(path.dirname(shellFilePath), { recursive: true })
  fs.writeFileSync(shellFilePath, nextContent, 'utf8')
  log(`已更新环境变量文件: ${shellFilePath}`)
}

function setWindowsEnv(apiKey, options) {
  const target = options.scope === 'machine' ? 'Machine' : 'User'
  const escapedApiKey = apiKey.replace(/'/g, "''")
  const command = `[System.Environment]::SetEnvironmentVariable('${ENV_KEY}', '${escapedApiKey}', [System.EnvironmentVariableTarget]::${target})`

  if (options.dryRun) {
    log(`(dry-run) 设置 Windows ${target} 环境变量: ${ENV_KEY}`)
    return
  }

  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      stdio: 'ignore'
    })
    log(`已设置 Windows ${target} 环境变量: ${ENV_KEY}`)
  } catch (error) {
    console.error(`[codex-setup] 设置 Windows 环境变量失败: ${error.message}`)
    if (target === 'Machine') {
      console.error('[codex-setup] Machine 级变量通常需要管理员权限，请尝试改用 --scope user')
    }
    process.exit(1)
  }
}

function ensureValidOptions(options) {
  if (options.help) {
    return
  }

  if (!options.apiKey) {
    console.error('[codex-setup] 缺少 API Key，请通过 --api-key 传入')
    process.exit(1)
  }

  if (!options.apiKey.startsWith('cr_')) {
    log('警告: API Key 看起来不是 cr_ 开头，请确认是否填写正确')
  }

  if (options.scope !== 'user' && options.scope !== 'machine') {
    console.error('[codex-setup] --scope 仅支持 user 或 machine')
    process.exit(1)
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

function main() {
  const options = parseOptions(process.argv.slice(2))
  ensureValidOptions(options)

  if (options.help) {
    showHelp()
    return
  }

  const codexDir = path.join(os.homedir(), '.codex')
  const configPath = path.join(codexDir, 'config.toml')
  const authPath = path.join(codexDir, 'auth.json')

  ensureCodexDir(codexDir, options)
  backupFile(configPath, options)
  backupFile(authPath, options)

  writeTextFile(configPath, buildConfigToml(options), options)
  writeTextFile(authPath, buildAuthJson(), options)

  if (process.platform === 'win32') {
    setWindowsEnv(options.apiKey, options)
  } else {
    const shellRcPath = detectShellRcPath(options)
    updateShellExport(shellRcPath, options.apiKey, options)
    log(`请执行: source ${shellRcPath}`)
  }

  if (!options.dryRun) {
    log('完成：Codex 配置与环境变量已设置')
    if (process.platform === 'win32') {
      log('请关闭并重新打开终端或 VSCode 后再运行 codex')
    } else {
      log('建议重新打开终端后运行 codex')
    }
  }
}

main()
