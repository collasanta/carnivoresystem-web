#!/usr/bin/env bash
# Adds the web2app env vars to Vercel (production + preview of branch web2app), reading values from
# ~/.config/33web without printing them. Run from anywhere: bash scripts/w2a-vercel-env.sh
set -uo pipefail
cd "$(dirname "$0")/.."
A=~/.config/33web/asaas.env; S=~/.config/33web/supabase.env
get() { grep "^$1=" "$2" | head -1 | cut -d= -f2- | tr -d '\n'; }

add() { # name value-command
  local name=$1; shift
  for target in "production" "preview web2app"; do
    "$@" | vercel env add "$name" $target >/dev/null 2>&1 && echo "ok   $name ($target)" || echo "skip $name ($target): já existe ou erro"
  done
}

add SUPABASE_URL              get SUPABASE_URL $S
add SUPABASE_SERVICE_ROLE_KEY get SUPABASE_SERVICE_ROLE_KEY $S
add RESEND_API_KEY            get RESEND_API_KEY $S
add REVENUECAT_SECRET_KEY     get REVENUECAT_SECRET_KEY $S
add META_CAPI_TOKEN           get META_CAPI_TOKEN $S
add ASAAS_API_KEY             bash -c "grep '^ASAAS_API_KEY=' $A | head -1 | cut -d= -f2- | sed 's/^\\\$//' | tr -d '\n'"
add ASAAS_WEBHOOK_TOKEN       get ASAAS_WEBHOOK_TOKEN $A
add ASAAS_ENV                 printf production
add PAYMENT_PROVIDER          printf asaas
echo "pronto. Confira com: vercel env ls"
