#!/usr/bin/env bash
# Real-money smoke test of the web2app checkout (production Asaas key) on a Vercel deployment. Every purchase it makes is
# stored as test (header x-w2a-test): no Meta Purchase, an app code unlocks for 24 h only.
# Asks for the CPF on screen (not saved, not in shell history), creates a lead, then a Pix charge
# (prints copia-e-cola). Pay it, then refund it in the Asaas portal.
# Usage: bash scripts/w2a-test-checkout.sh <URL> [plan] [ebook]
#   URL   https://leodiet.com or a https://<deployment>.vercel.app preview
#   plan  test (hidden R$ 5 app plan, 24 h code, default) | ebook (the R$ 5 guide alone, no code) | quarterly | annual | lifetime
#   ebook 1 = add the R$ 5 guide to an app plan (as /quiz/oferta does with the bump), 0 = app alone.
#         Default: 0 for test (stays R$ 5), 1 for the real app plans. Ignored for plan ebook.
set -uo pipefail
cd "$(dirname "$0")/.."
U=${1:?deployment URL}; PLAN=${2:-test}
if [ "$PLAN" = test ]; then EB=${3:-0}; else EB=${3:-1}; fi
[ "$EB" = 1 ] && EBJ=true || EBJ=false
# the hidden test plan needs the webhook token as x-w2a-test (read from the file, never printed)
T=$(grep "^ASAAS_WEBHOOK_TOKEN=" ~/.config/33web/asaas.env | head -1 | cut -d= -f2- | tr -d "\n")
read -rp "E-mail que recebe o código: " EMAIL
read -rsp "CPF do pagador: " CPF; echo
call() { # vercel curl gets past the Vercel auth of preview deployments; the public domain needs plain curl
  if [[ $U == *.vercel.app* ]]; then vercel curl "$1" --deployment "$U" -- -s -X POST -H 'content-type: application/json' -H "x-w2a-test: $T" -d "$2" 2>/dev/null
  else curl -s -X POST "$U$1" -H 'content-type: application/json' -H "x-w2a-test: $T" -d "$2"; fi; }
call /api/w2a/lead '{}' >/dev/null # first call only sets the Vercel auth bypass cookie
LEAD=$(call /api/w2a/lead '{"email":"'"$EMAIL"'","name":"Teste W2A","quizVersion":"pt-v2"}' |
  python3 -c 'import sys,json;print(json.load(sys.stdin).get("leadId",""))')
[ -n "$LEAD" ] || { echo "falhou ao criar o lead"; exit 1; }
for m in pix; do
  echo "== $m ($PLAN, guide: $EBJ)"
  call /api/w2a/checkout "{\"plan\":\"$PLAN\",\"ebook\":$EBJ,\"leadId\":\"$LEAD\",\"method\":\"$m\",\"cpf\":\"$CPF\"}" | python3 -c '
import sys,json
d=json.load(sys.stdin); a=d.get("action") or {}
if "error" in d: print("erro:", d["error"]); sys.exit()
print("purchaseId:", d["purchaseId"], "| asaas:", a.get("providerRef"), "| test:", d.get("test"))
print("pix copia-e-cola:", a["copyPaste"]) if a.get("kind")=="pix" else print("link do cartão:", a.get("url"))'
done
