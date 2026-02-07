# Codex 使用教程（按页面步骤逐平台完整展开）

> 说明：本文件按教程页面的步骤顺序编写，每个平台都写全，不抽取重复内容。
>
> 固定地址：`https://codex.funai.vip/openai`

---

## Windows 平台教程

### 方式 A：用于 VSCode / Cursor / Windsurf 等插件

#### 步骤 1：安装 Node.js 环境

Codex 需要 Node.js 环境才能运行。

**方法一：官网下载（推荐）**

1. 打开浏览器访问 `https://nodejs.org/`
2. 点击 `LTS` 版本进行下载（推荐长期支持版本）
3. 下载完成后双击 `.msi` 文件
4. 按照安装向导完成安装，保持默认设置即可

**方法二：使用包管理器**

```powershell
# 使用 Chocolatey
choco install nodejs

# 或使用 Scoop
scoop install nodejs
```

**Windows 注意事项**

- 建议使用 PowerShell 而不是 CMD
- 如果遇到权限问题，尝试以管理员身份运行
- 某些杀毒软件可能会误报，需要添加白名单

**验证安装是否成功**

安装完成后，打开 PowerShell 或 CMD，输入：

```powershell
node --version
npm --version
```

如果显示版本号，说明安装成功。

#### 步骤 2：配置 Codex

配置 Codex 以连接到中转服务。

**1）配置文件 `config.toml`**

路径：`%USERPROFILE%\.codex\config.toml`

在文件开头添加：

```toml
model_provider = "crs"
model = "gpt-5-codex"
model_reasoning_effort = "high"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.crs]
name = "crs"
base_url = "https://codex.funai.vip/openai"
wire_api = "responses"
requires_openai_auth = true
env_key = "CRS_OAI_KEY"
```

一键写入命令：

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex" | Out-Null; "model_provider = `"crs`"`nmodel = `"gpt-5-codex`"`nmodel_reasoning_effort = `"high`"`ndisable_response_storage = true`npreferred_auth_method = `"apikey`"`n`n[model_providers.crs]`nname = `"crs`"`nbase_url = `"https://codex.funai.vip/openai`"`nwire_api = `"responses`"`nrequires_openai_auth = true`nenv_key = `"CRS_OAI_KEY`"" | Set-Content -Path "$env:USERPROFILE\.codex\config.toml" -Force
```

**2）认证文件 `auth.json`**

路径：`%USERPROFILE%\.codex\auth.json`

文件内容：

```json
{
  "OPENAI_API_KEY": null
}
```

⚠️ 必须将 `OPENAI_API_KEY` 设置为 `null`，否则 Codex 会优先使用它而忽略环境变量。

一键写入命令：

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex" | Out-Null; '{"OPENAI_API_KEY": null}' | Set-Content -Path "$env:USERPROFILE\.codex\auth.json" -Force
```

**3）设置环境变量 `CRS_OAI_KEY`**

设置为你的 API 密钥（例如 `cr_XXXXXXXXXXX`）。

系统级环境变量（推荐）：

```powershell
[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", "cr_XXXXXXXXXXX", [System.EnvironmentVariableTarget]::Machine)
```

用户级环境变量（不推荐）：

```powershell
[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", "cr_XXXXXXXXXXX", [System.EnvironmentVariableTarget]::User)
```

设置后需要重新打开终端窗口才能生效。

**4）验证环境变量**

```powershell
Get-ChildItem Env:CRS_OAI_KEY
```

**如何删除环境变量（可选）**

删除用户级：

```powershell
[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", $null, [System.EnvironmentVariableTarget]::User)
```

删除系统级：

```powershell
[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", $null, [System.EnvironmentVariableTarget]::Machine)
```

验证：

```powershell
Get-ChildItem Env:CRS_OAI_KEY
```

**5）插件使用时重启 IDE**

完成以上配置后，完全退出并重新打开 VSCode / Cursor / Windsurf。

---

### 方式 B：用于 CLI 终端（Codex CLI）

#### 步骤 1：安装 Node.js 环境

Codex CLI 需要 Node.js 环境。

**方法一：官网下载（推荐）**

1. 打开浏览器访问 `https://nodejs.org/`
2. 点击 `LTS` 版本进行下载（推荐长期支持版本）
3. 下载完成后双击 `.msi` 文件
4. 按照安装向导完成安装，保持默认设置即可

**方法二：使用包管理器**

```powershell
# 使用 Chocolatey
choco install nodejs

# 或使用 Scoop
scoop install nodejs
```

**验证安装是否成功**

```powershell
node --version
npm --version
```

#### 步骤 2：安装 Codex CLI

```powershell
npm i -g @openai/codex
```

#### 步骤 3：配置 Codex

**1）配置文件 `config.toml`**

路径：`%USERPROFILE%\.codex\config.toml`

```toml
model_provider = "crs"
model = "gpt-5-codex"
model_reasoning_effort = "high"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.crs]
name = "crs"
base_url = "https://codex.funai.vip/openai"
wire_api = "responses"
requires_openai_auth = true
env_key = "CRS_OAI_KEY"
```

一键写入命令：

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex" | Out-Null; "model_provider = `"crs`"`nmodel = `"gpt-5-codex`"`nmodel_reasoning_effort = `"high`"`ndisable_response_storage = true`npreferred_auth_method = `"apikey`"`n`n[model_providers.crs]`nname = `"crs`"`nbase_url = `"https://codex.funai.vip/openai`"`nwire_api = `"responses`"`nrequires_openai_auth = true`nenv_key = `"CRS_OAI_KEY`"" | Set-Content -Path "$env:USERPROFILE\.codex\config.toml" -Force
```

**2）认证文件 `auth.json`**

路径：`%USERPROFILE%\.codex\auth.json`

```json
{
  "OPENAI_API_KEY": null
}
```

一键写入命令：

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex" | Out-Null; '{"OPENAI_API_KEY": null}' | Set-Content -Path "$env:USERPROFILE\.codex\auth.json" -Force
```

**3）设置环境变量**

```powershell
[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", "cr_XXXXXXXXXXX", [System.EnvironmentVariableTarget]::Machine)
```

**4）验证环境变量**

```powershell
Get-ChildItem Env:CRS_OAI_KEY
```

#### 步骤 4：启动 Codex CLI

重新打开终端后执行：

```powershell
codex
```

---

## macOS 平台教程

### 方式 A：用于 VSCode / Cursor / Windsurf 等插件

#### 步骤 1：安装 Node.js 环境

Codex 需要 Node.js 环境才能运行。

**方法一：使用 Homebrew（推荐）**

```bash
# 更新 Homebrew
brew update

# 安装 Node.js
brew install node
```

**方法二：官网下载**

1. 访问 `https://nodejs.org/`
2. 下载适合 macOS 的 LTS 版本
3. 打开下载的 `.pkg` 文件
4. 按安装程序指引完成安装

**macOS 注意事项**

- 如果遇到权限问题，可能需要使用 `sudo`
- 首次运行可能需要在系统偏好设置中允许
- 建议使用 Terminal 或 iTerm2

**验证安装是否成功**

安装完成后打开 Terminal，输入：

```bash
node --version
npm --version
```

#### 步骤 2：配置 Codex

**1）配置文件 `config.toml`**

路径：`~/.codex/config.toml`

```toml
model_provider = "crs"
model = "gpt-5-codex"
model_reasoning_effort = "high"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.crs]
name = "crs"
base_url = "https://codex.funai.vip/openai"
wire_api = "responses"
requires_openai_auth = true
env_key = "CRS_OAI_KEY"
```

一键写入命令：

```bash
mkdir -p ~/.codex && printf 'model_provider = "crs"\nmodel = "gpt-5-codex"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\npreferred_auth_method = "apikey"\n\n[model_providers.crs]\nname = "crs"\nbase_url = "https://codex.funai.vip/openai"\nwire_api = "responses"\nrequires_openai_auth = true\nenv_key = "CRS_OAI_KEY"\\n' > ~/.codex/config.toml
```

**2）认证文件 `auth.json`**

路径：`~/.codex/auth.json`

```json
{
  "OPENAI_API_KEY": null
}
```

一键写入命令：

```bash
mkdir -p ~/.codex && echo '{"OPENAI_API_KEY": null}' > ~/.codex/auth.json
```

**3）设置环境变量 `CRS_OAI_KEY`**

检查当前 shell：

```bash
echo $SHELL
```

检查是否已有旧配置：

```bash
# zsh
grep 'CRS_OAI_KEY' ~/.zshrc

# bash
grep 'CRS_OAI_KEY' ~/.bashrc
```

zsh（macOS 默认）：

```bash
echo 'export CRS_OAI_KEY="cr_XXXXXXXXXXX"' >> ~/.zshrc && source ~/.zshrc
```

bash：

```bash
echo 'export CRS_OAI_KEY="cr_XXXXXXXXXXX"' >> ~/.bashrc && source ~/.bashrc
```

设置后需要重新打开终端窗口或执行 `source` 才能生效。

**4）验证环境变量**

```bash
echo "CRS_OAI_KEY: $CRS_OAI_KEY"
```

**如何删除环境变量（可选）**

从 zsh 配置中删除：

```bash
sed -i '' '/CRS_OAI_KEY/d' ~/.zshrc && source ~/.zshrc
```

从 bash 配置中删除：

```bash
sed -i '' '/CRS_OAI_KEY/d' ~/.bashrc && source ~/.bashrc
```

验证：

```bash
echo "CRS_OAI_KEY: $CRS_OAI_KEY"
```

**5）插件使用时重启 IDE**

完全退出并重新打开 VSCode / Cursor / Windsurf。

---

### 方式 B：用于 CLI 终端（Codex CLI）

#### 步骤 1：安装 Node.js 环境

**方法一：使用 Homebrew（推荐）**

```bash
brew update
brew install node
```

**方法二：官网下载**

1. 访问 `https://nodejs.org/`
2. 下载适合 macOS 的 LTS 版本
3. 打开 `.pkg` 安装

**验证安装是否成功**

```bash
node --version
npm --version
```

#### 步骤 2：安装 Codex CLI

```bash
npm i -g @openai/codex
```

#### 步骤 3：配置 Codex

`config.toml` 路径：`~/.codex/config.toml`

```toml
model_provider = "crs"
model = "gpt-5-codex"
model_reasoning_effort = "high"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.crs]
name = "crs"
base_url = "https://codex.funai.vip/openai"
wire_api = "responses"
requires_openai_auth = true
env_key = "CRS_OAI_KEY"
```

一键写入命令：

```bash
mkdir -p ~/.codex && printf 'model_provider = "crs"\nmodel = "gpt-5-codex"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\npreferred_auth_method = "apikey"\n\n[model_providers.crs]\nname = "crs"\nbase_url = "https://codex.funai.vip/openai"\nwire_api = "responses"\nrequires_openai_auth = true\nenv_key = "CRS_OAI_KEY"\\n' > ~/.codex/config.toml
```

`auth.json` 路径：`~/.codex/auth.json`

```json
{
  "OPENAI_API_KEY": null
}
```

一键写入命令：

```bash
mkdir -p ~/.codex && echo '{"OPENAI_API_KEY": null}' > ~/.codex/auth.json
```

环境变量：

```bash
echo 'export CRS_OAI_KEY="cr_XXXXXXXXXXX"' >> ~/.zshrc && source ~/.zshrc
```

验证：

```bash
echo "CRS_OAI_KEY: $CRS_OAI_KEY"
```

#### 步骤 4：启动 Codex CLI

```bash
codex
```

---

## Linux / WSL2 平台教程

> 按你的要求，此平台仅写 CLI 方式。

### 方式：用于 CLI 终端（Codex CLI）

#### 步骤 1：安装 Node.js 环境

**方法一：使用 nvm（推荐）**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc

# 安装最新 LTS 版本
nvm install --lts
```

**方法二：使用包管理器**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora
sudo dnf install nodejs

# Arch Linux
sudo pacman -S nodejs npm
```

**Linux / WSL2 注意事项**

- WSL2 用户建议在 Linux 子系统中安装，而不是 Windows
- 使用 nvm 可以避免权限问题
- 确保 shell 配置文件正确加载了 nvm

**验证安装是否成功**

```bash
node --version
npm --version
```

#### 步骤 2：安装 Codex CLI

```bash
npm i -g @openai/codex
```

#### 步骤 3：配置 Codex

`config.toml` 路径：`~/.codex/config.toml`

```toml
model_provider = "crs"
model = "gpt-5-codex"
model_reasoning_effort = "high"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.crs]
name = "crs"
base_url = "https://codex.funai.vip/openai"
wire_api = "responses"
requires_openai_auth = true
env_key = "CRS_OAI_KEY"
```

一键写入命令：

```bash
mkdir -p ~/.codex && printf 'model_provider = "crs"\nmodel = "gpt-5-codex"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\npreferred_auth_method = "apikey"\n\n[model_providers.crs]\nname = "crs"\nbase_url = "https://codex.funai.vip/openai"\nwire_api = "responses"\nrequires_openai_auth = true\nenv_key = "CRS_OAI_KEY"\\n' > ~/.codex/config.toml
```

`auth.json` 路径：`~/.codex/auth.json`

```json
{
  "OPENAI_API_KEY": null
}
```

一键写入命令：

```bash
mkdir -p ~/.codex && echo '{"OPENAI_API_KEY": null}' > ~/.codex/auth.json
```

设置环境变量：

检查当前 shell：

```bash
echo $SHELL
```

检查旧配置：

```bash
# zsh
grep 'CRS_OAI_KEY' ~/.zshrc

# bash
grep 'CRS_OAI_KEY' ~/.bashrc
```

bash（Linux 默认）：

```bash
echo 'export CRS_OAI_KEY="cr_XXXXXXXXXXX"' >> ~/.bashrc && source ~/.bashrc
```

zsh：

```bash
echo 'export CRS_OAI_KEY="cr_XXXXXXXXXXX"' >> ~/.zshrc && source ~/.zshrc
```

验证环境变量：

```bash
echo "CRS_OAI_KEY: $CRS_OAI_KEY"
```

删除环境变量（可选）：

```bash
sed -i '' '/CRS_OAI_KEY/d' ~/.zshrc && source ~/.zshrc
sed -i '' '/CRS_OAI_KEY/d' ~/.bashrc && source ~/.bashrc
```

再次验证：

```bash
echo "CRS_OAI_KEY: $CRS_OAI_KEY"
```

#### 步骤 4：启动 Codex CLI

```bash
codex
```

---

## Cherry Studio / 第三方插件接入教程

1. 添加供应商（名称随意）
2. 供应商类型选择：`Openai-Response`（**一定选择这个**）
3. 下一步填写：

- API 秘钥：`cr_XXXXXXXXXXX`
- API 地址：`https://codex.funai.vip/openai`
- 模型 ID：`gpt-5.2` 或 `gpt-5.2-codex` 或 `gpt-5.3-codex`

