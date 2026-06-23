#!/usr/bin/env bash
# Claude Code status line script

input=$(cat)

# ── Data extraction ────────────────────────────────────────────────────────────
model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
ctx_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
ctx_remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
ctx_total=$(echo "$input" | jq -r '.context_window.context_window_size // empty')
ctx_input_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // empty')
five_hour_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
five_hour_reset=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
seven_day_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
seven_day_reset=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')

# ── Separator ─────────────────────────────────────────────────────────────────
SEP=" | "

# ── Colors (ANSI) ──────────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BLUE="\033[34m"
MAGENTA="\033[35m"
WHITE="\033[37m"

# ── Helper: progress bar ───────────────────────────────────────────────────────
# Usage: make_bar <used_pct> <width> <fill_char> <empty_char>
make_bar() {
  local pct="${1:-0}"
  local width="${2:-10}"
  local fill="${3:-█}"
  local empty="${4:-░}"
  local filled=$(echo "$pct $width" | awk '{printf "%d", ($1/100)*$2+0.5}')
  local bar=""
  for i in $(seq 1 "$filled"); do bar="${bar}${fill}"; done
  for i in $(seq "$filled" "$((width-1))"); do bar="${bar}${empty}"; done
  echo "$bar"
}

# ── Helper: color for percentage (used%) ──────────────────────────────────────
pct_color() {
  local pct="${1:-0}"
  if   [ "$(echo "$pct < 50" | bc -l)" = "1" ]; then printf "$GREEN"
  elif [ "$(echo "$pct < 80" | bc -l)" = "1" ]; then printf "$YELLOW"
  else printf "$RED"; fi
}

# ── Helper: remaining time string ─────────────────────────────────────────────
time_until() {
  local epoch="$1"
  local now
  now=$(date +%s)
  local diff=$((epoch - now))
  if [ "$diff" -le 0 ]; then
    echo "now"
    return
  fi
  local h=$((diff / 3600))
  local m=$(( (diff % 3600) / 60 ))
  if [ "$h" -gt 0 ]; then
    printf "%dh%02dm" "$h" "$m"
  else
    printf "%dm" "$m"
  fi
}

# ── Helper: format token count (K/M) ──────────────────────────────────────────
fmt_tokens() {
  local n="$1"
  echo "$n" | awk '{
    if ($1 >= 1000000) printf "%.1fM", $1/1000000
    else if ($1 >= 1000) printf "%.0fK", $1/1000
    else printf "%d", $1
  }'
}

# ── Line 1: Model / Context bar / Git branch+diff / Working dir ───────────────

# Context bar
if [ -n "$ctx_used" ]; then
  ctx_pct=$(printf "%.0f" "$ctx_used")
  ctx_bar=$(make_bar "$ctx_pct" 10)
  ctx_col=$(pct_color "$ctx_pct")
  remaining_pct=$(printf "%.0f" "${ctx_remaining:-$(echo "100 - $ctx_used" | bc -l)}")
  # Token count annotation for pay-as-you-go context insight
  token_ann=""
  if [ -n "$ctx_input_tokens" ] && [ -n "$ctx_total" ]; then
    used_fmt=$(fmt_tokens "$ctx_input_tokens")
    total_fmt=$(fmt_tokens "$ctx_total")
    token_ann=" ${DIM}${used_fmt}/${total_fmt}${RESET}"
  fi
  ctx_str="${ctx_col}${ctx_bar}${RESET} ${ctx_col}${remaining_pct}%${RESET}${token_ann}"
else
  ctx_str="${DIM}no ctx${RESET}"
fi

# Git branch and diff
git_info=""
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$cwd" -c core.fsmonitor=false symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  # +added/-removed lines (staged + unstaged)
  diff_stat=$(git -C "$cwd" -c core.fsmonitor=false diff --numstat HEAD 2>/dev/null)
  if [ -n "$diff_stat" ]; then
    added=$(echo "$diff_stat" | awk '{s+=$1} END {print s+0}')
    removed=$(echo "$diff_stat" | awk '{s+=$2} END {print s+0}')
    diff_str=""
    [ "$added" -gt 0 ]   && diff_str="${diff_str}${GREEN}+${added}${RESET}"
    [ "$removed" -gt 0 ] && diff_str="${diff_str}${RED}-${removed}${RESET}"
    [ -z "$diff_str" ]   && diff_str="${DIM}clean${RESET}"
  else
    diff_str="${DIM}clean${RESET}"
  fi
  git_info="${MAGENTA}${branch}${RESET} ${diff_str}"
fi

# Working directory: parent/current
if [ -n "$cwd" ]; then
  parent=$(dirname "$cwd")
  parent_base=$(basename "$parent")
  current_base=$(basename "$cwd")
  if [ "$parent_base" = "/" ] || [ "$parent_base" = "." ]; then
    dir_str="${CYAN}/${current_base}${RESET}"
  else
    dir_str="${DIM}${parent_base}/${RESET}${CYAN}${current_base}${RESET}"
  fi
else
  dir_str="${DIM}unknown${RESET}"
fi

# Assemble line 1
line1_parts=()
line1_parts+=("${BOLD}${WHITE}${model}${RESET}")
line1_parts+=("${ctx_str}")
[ -n "$git_info" ] && line1_parts+=("${git_info}")
line1_parts+=("${dir_str}")

line1=""
for part in "${line1_parts[@]}"; do
  [ -n "$line1" ] && line1="${line1}${SEP}"
  line1="${line1}${part}"
done

# ── Line 2: Usage / rate limits ───────────────────────────────────────────────
line2=""

if [ -n "$five_hour_pct" ] || [ -n "$seven_day_pct" ]; then
  # Subscription plan: show 5h and/or 7d rate limits
  parts=()

  if [ -n "$five_hour_pct" ]; then
    pct=$(printf "%.0f" "$five_hour_pct")
    bar=$(make_bar "$pct" 8)
    col=$(pct_color "$pct")
    reset_str=""
    [ -n "$five_hour_reset" ] && reset_str=" ${DIM}resets:$(time_until "$five_hour_reset")${RESET}"
    parts+=("5h:${col}${bar}${RESET} ${col}${pct}%${RESET}${reset_str}")
  fi

  if [ -n "$seven_day_pct" ]; then
    pct=$(printf "%.0f" "$seven_day_pct")
    bar=$(make_bar "$pct" 8)
    col=$(pct_color "$pct")
    reset_str=""
    [ -n "$seven_day_reset" ] && reset_str=" ${DIM}resets:$(time_until "$seven_day_reset")${RESET}"
    parts+=("7d:${col}${bar}${RESET} ${col}${pct}%${RESET}${reset_str}")
  fi

  line2="${parts[0]}"
  for i in "${!parts[@]}"; do
    [ "$i" -eq 0 ] && continue
    line2="${line2}${SEP}${parts[$i]}"
  done

else
  # Pay-as-you-go: show token usage bar from context_window data
  if [ -n "$ctx_used" ] && [ -n "$ctx_input_tokens" ] && [ -n "$ctx_total" ]; then
    ctx_pct=$(printf "%.0f" "$ctx_used")
    ctx_bar=$(make_bar "$ctx_pct" 12)
    ctx_col=$(pct_color "$ctx_pct")
    rem_pct=$(printf "%.0f" "${ctx_remaining:-$(echo "100 - $ctx_used" | bc -l)}")
    used_fmt=$(fmt_tokens "$ctx_input_tokens")
    total_fmt=$(fmt_tokens "$ctx_total")
    remaining_tokens=$(echo "$ctx_input_tokens $ctx_total" | awk '{printf "%d", $2-$1}')
    rem_fmt=$(fmt_tokens "$remaining_tokens")
    line2="${CYAN}pay-as-you-go${RESET}${SEP}${ctx_col}${ctx_bar}${RESET} ${ctx_col}${rem_pct}% remaining${RESET}${SEP}${DIM}${used_fmt} used / ${total_fmt} total (${rem_fmt} left)${RESET}"
  elif [ -n "$ctx_used" ]; then
    ctx_pct=$(printf "%.0f" "$ctx_used")
    ctx_bar=$(make_bar "$ctx_pct" 12)
    ctx_col=$(pct_color "$ctx_pct")
    rem_pct=$(printf "%.0f" "${ctx_remaining:-$(echo "100 - $ctx_used" | bc -l)}")
    line2="${CYAN}pay-as-you-go${RESET}${SEP}${ctx_col}${ctx_bar}${RESET} ${ctx_col}${rem_pct}% remaining${RESET}"
  else
    line2="${DIM}pay-as-you-go${RESET}"
  fi
fi

# ── Output ─────────────────────────────────────────────────────────────────────
printf "${line1}\n${line2}\n"
