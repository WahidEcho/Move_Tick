#!/usr/bin/env bash
# Convert an Apple Wallet Pass .p12 + WWDR .cer into the base64 env values
# Move-Tick needs, and print ready-to-paste .env.local lines.
#
# Usage:
#   ./scripts/apple-wallet-cert-to-env.sh <pass.p12> <AppleWWDRCAG4.cer> <pass-type-id> <team-id>
#
# Example:
#   ./scripts/apple-wallet-cert-to-env.sh ~/Downloads/pass.p12 ~/Downloads/AppleWWDRCAG4.cer pass.org.mbeg.movetick ABCDE12345
#
# You'll be prompted once for the .p12 password (from Keychain export).
# The key is exported WITHOUT a passphrase (-nodes) so no extra env var is needed.

set -euo pipefail

P12="${1:?path to pass.p12 required}"
WWDR="${2:?path to AppleWWDRCAG4.cer required}"
PASS_TYPE_ID="${3:?pass type identifier required (e.g. pass.org.mbeg.movetick)}"
TEAM_ID="${4:?team id required (10 chars from Membership page)}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Enter the .p12 password you set in Keychain when prompted by openssl..." >&2

# Cert (public) and key (private, unencrypted) as PEM.
openssl pkcs12 -legacy -in "$P12" -clcerts -nokeys -out "$TMP/signerCert.pem" 2>/dev/null \
  || openssl pkcs12 -in "$P12" -clcerts -nokeys -out "$TMP/signerCert.pem"
openssl pkcs12 -legacy -in "$P12" -nocerts -nodes -out "$TMP/signerKey.pem" 2>/dev/null \
  || openssl pkcs12 -in "$P12" -nocerts -nodes -out "$TMP/signerKey.pem"

# WWDR DER -> PEM.
openssl x509 -inform DER -in "$WWDR" -out "$TMP/wwdr.pem"

b64() { base64 -i "$1" | tr -d '\n'; }

cat <<EOF

# ---- Paste these into Move-Tick/.env.local ----
APPLE_PASS_TYPE_IDENTIFIER=$PASS_TYPE_ID
APPLE_TEAM_IDENTIFIER=$TEAM_ID
APPLE_PASS_ORG_NAME=Move-Tick
APPLE_PASS_SIGNER_CERT_B64=$(b64 "$TMP/signerCert.pem")
APPLE_PASS_SIGNER_KEY_B64=$(b64 "$TMP/signerKey.pem")
APPLE_WWDR_CERT_B64=$(b64 "$TMP/wwdr.pem")
# (no APPLE_PASS_SIGNER_KEY_PASSPHRASE needed — key exported unencrypted)
# ------------------------------------------------
EOF
