param(
    [Parameter(Mandatory = $true)]
    [string]$Terminal,

    [Parameter(Mandatory = $true)]
    [string]$Sentinel,

    [ValidateRange(1, 3600)]
    [int]$TimeoutSeconds = 300,

    [ValidateRange(1, 300)]
    [int]$PollSeconds = 10,

    [ValidateRange(20, 500)]
    [int]$ScreenLines = 160
)

$ErrorActionPreference = 'Stop'
$startedAt = Get-Date
$lastHash = $null
$lastChangeAt = $startedAt

function Invoke-OrcaJson {
    param([string[]]$Arguments)

    $raw = & orca @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "orca $($Arguments -join ' ') failed: $($raw -join [Environment]::NewLine)"
    }

    return ($raw -join [Environment]::NewLine) | ConvertFrom-Json
}

while ($true) {
    $now = Get-Date
    $elapsed = [int]($now - $startedAt).TotalSeconds

    if ($elapsed -ge $TimeoutSeconds) {
        [pscustomobject]@{
            state = 'TIMEOUT'
            terminal = $Terminal
            sentinel = $Sentinel
            elapsedSeconds = $elapsed
            lastChangeAt = $lastChangeAt.ToString('o')
            note = 'Timeout is a checkpoint, not proof of worker failure.'
        } | ConvertTo-Json -Compress
        exit 2
    }

    try {
        $show = Invoke-OrcaJson @('terminal', 'show', '--terminal', $Terminal, '--json')
        $read = Invoke-OrcaJson @('terminal', 'read', '--terminal', $Terminal, '--screen', '--limit', "$ScreenLines", '--json')
    }
    catch {
        [pscustomobject]@{
            state = 'UNKNOWN'
            terminal = $Terminal
            sentinel = $Sentinel
            elapsedSeconds = $elapsed
            error = $_.Exception.Message
        } | ConvertTo-Json -Compress
        exit 3
    }

    $screen = ($read.result.terminal.tail -join "`n")
    $bytes = [Text.Encoding]::UTF8.GetBytes($screen)
    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        $hash = [BitConverter]::ToString($sha256.ComputeHash($bytes)).Replace('-', '')
    }
    finally {
        $sha256.Dispose()
    }

    if ($hash -ne $lastHash) {
        $lastHash = $hash
        $lastChangeAt = $now
    }

    if ($screen.Contains($Sentinel)) {
        [pscustomobject]@{
            state = 'SENTINEL_FOUND'
            terminal = $Terminal
            sentinel = $Sentinel
            elapsedSeconds = $elapsed
            lastOutputAt = $show.result.terminal.lastOutputAt
            terminalStatus = $show.result.terminal.connected
        } | ConvertTo-Json -Compress
        exit 0
    }

    if ($show.result.terminal.connected -ne $true) {
        [pscustomobject]@{
            state = 'UNKNOWN'
            terminal = $Terminal
            sentinel = $Sentinel
            elapsedSeconds = $elapsed
            note = 'Terminal is not connected; preserve resources and inspect before deciding.'
        } | ConvertTo-Json -Compress
        exit 3
    }

    Start-Sleep -Seconds $PollSeconds
}
