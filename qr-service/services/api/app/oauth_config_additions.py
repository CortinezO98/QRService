"""
Configuración actualizada con variables OAuth
Agregar al .env:
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  FACEBOOK_CLIENT_ID=...
  FACEBOOK_CLIENT_SECRET=...
  FRONTEND_URL=http://localhost:5200
"""

# Agregar estas líneas al config.py existente dentro de la clase Settings:

OAUTH_SETTINGS = '''
    # ── Google OAuth ──────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:7000/api/v1/auth/google/callback"

    # ── Facebook OAuth ────────────────────────────────────────
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    FACEBOOK_REDIRECT_URI: str = "http://localhost:7000/api/v1/auth/facebook/callback"

    # ── Frontend URL (para redirects post-OAuth) ──────────────
    FRONTEND_URL: str = "http://localhost:5200"
'''

# Agregar al requirements.txt:
REQUIREMENTS = '''
httpx==0.26.0          # Ya está — cliente HTTP para OAuth
'''

# Agregar al .env:
ENV_VARS = '''
# ── Google OAuth (console.cloud.google.com) ───────────────────
GOOGLE_CLIENT_ID=CHANGE_ME.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=CHANGE_ME
GOOGLE_REDIRECT_URI=http://localhost:7000/api/v1/auth/google/callback

# ── Facebook OAuth (developers.facebook.com) ──────────────────
FACEBOOK_CLIENT_ID=CHANGE_ME
FACEBOOK_CLIENT_SECRET=CHANGE_ME
FACEBOOK_REDIRECT_URI=http://localhost:7000/api/v1/auth/facebook/callback

# ── Frontend URL ───────────────────────────────────────────────
FRONTEND_URL=http://localhost:5200
'''