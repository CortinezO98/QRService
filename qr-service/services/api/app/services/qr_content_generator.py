"""
QR Content Generator — Convierte payload estructurado en string para el QR
SWEBOK v4: Software Design — Strategy Pattern
Cada tipo de QR sabe cómo convertirse en el string que el lector interpretará.
"""
from typing import Any


# ── Generadores por tipo ──────────────────────────────────────

def generate_url(p: dict) -> str:
    url = p.get("url", "").strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def generate_text(p: dict) -> str:
    return p.get("text", "")


def generate_email(p: dict) -> str:
    email = p.get("email", "")
    subject = p.get("subject", "")
    body = p.get("body", "")
    result = f"mailto:{email}"
    params = []
    if subject:
        params.append(f"subject={subject}")
    if body:
        params.append(f"body={body}")
    if params:
        result += "?" + "&".join(params)
    return result


def generate_phone(p: dict) -> str:
    return f"tel:{p.get('phone', '').replace(' ', '')}"


def generate_whatsapp(p: dict) -> str:
    phone = p.get("phone", "").replace("+", "").replace(" ", "").replace("-", "")
    message = p.get("message", "")
    url = f"https://wa.me/{phone}"
    if message:
        import urllib.parse
        url += f"?text={urllib.parse.quote(message)}"
    return url


def generate_wifi(p: dict) -> str:
    ssid = p.get("ssid", "")
    password = p.get("password", "")
    security = p.get("security", "WPA")  # WPA, WEP, nopass
    hidden = "true" if p.get("hidden", False) else "false"
    return f"WIFI:T:{security};S:{ssid};P:{password};H:{hidden};;"


def generate_sms(p: dict) -> str:
    phone = p.get("phone", "")
    message = p.get("message", "")
    return f"sms:{phone}?body={message}" if message else f"sms:{phone}"


def generate_vcard(p: dict) -> str:
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"N:{p.get('last_name', '')};{p.get('first_name', '')};;;",
        f"FN:{p.get('first_name', '')} {p.get('last_name', '')}",
    ]
    if p.get("org"):
        lines.append(f"ORG:{p['org']}")
    if p.get("title"):
        lines.append(f"TITLE:{p['title']}")
    if p.get("phone"):
        lines.append(f"TEL;TYPE=WORK,VOICE:{p['phone']}")
    if p.get("mobile"):
        lines.append(f"TEL;TYPE=CELL:{p['mobile']}")
    if p.get("email"):
        lines.append(f"EMAIL:{p['email']}")
    if p.get("website"):
        lines.append(f"URL:{p['website']}")
    if p.get("address"):
        lines.append(f"ADR;TYPE=WORK:;;{p['address']};;;;")
    lines.append("END:VCARD")
    return "\n".join(lines)


def generate_maps(p: dict) -> str:
    if p.get("lat") and p.get("lng"):
        return f"https://www.google.com/maps?q={p['lat']},{p['lng']}"
    address = p.get("address", "")
    import urllib.parse
    return f"https://www.google.com/maps/search/{urllib.parse.quote(address)}"


def generate_youtube(p: dict) -> str:
    video_id = p.get("video_id", "")
    url = p.get("url", "")
    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"
    return url or "https://youtube.com"


def generate_spotify(p: dict) -> str:
    return p.get("url", "https://open.spotify.com")


def generate_social(base_url: str, p: dict) -> str:
    username = p.get("username", "").lstrip("@")
    url = p.get("url", "")
    return url or f"{base_url}/{username}"


def generate_calendar(p: dict) -> str:
    """iCalendar format."""
    title = p.get("title", "")
    start = p.get("start", "").replace("-", "").replace(":", "").replace(" ", "T")
    end = p.get("end", "").replace("-", "").replace(":", "").replace(" ", "T")
    location = p.get("location", "")
    description = p.get("description", "")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        f"SUMMARY:{title}",
        f"DTSTART:{start}",
        f"DTEND:{end}",
    ]
    if location:
        lines.append(f"LOCATION:{location}")
    if description:
        lines.append(f"DESCRIPTION:{description}")
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\n".join(lines)


def generate_paypal(p: dict) -> str:
    email = p.get("email", "")
    amount = p.get("amount", "")
    currency = p.get("currency", "USD")
    item = p.get("item_name", "")
    url = f"https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business={email}&currency_code={currency}"
    if amount:
        url += f"&amount={amount}"
    if item:
        import urllib.parse
        url += f"&item_name={urllib.parse.quote(item)}"
    return url


def generate_crypto(p: dict) -> str:
    """Bitcoin/Ethereum payment URI."""
    coin = p.get("coin", "bitcoin").lower()
    address = p.get("address", "")
    amount = p.get("amount", "")
    result = f"{coin}:{address}"
    if amount:
        result += f"?amount={amount}"
    return result


def generate_upi(p: dict) -> str:
    vpa = p.get("vpa", "")
    name = p.get("name", "")
    amount = p.get("amount", "")
    return f"upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR"


def generate_simple_url(p: dict, base: str) -> str:
    username = p.get("username", "")
    url = p.get("url", "")
    return url or f"{base}/{username}"


# ── Dispatcher ────────────────────────────────────────────────

GENERATORS = {
    "url":           generate_url,
    "text":          generate_text,
    "email":         generate_email,
    "phone":         generate_phone,
    "whatsapp":      generate_whatsapp,
    "wifi":          generate_wifi,
    "sms":           generate_sms,
    "vcard":         generate_vcard,
    "maps":          generate_maps,
    "youtube":       generate_youtube,
    "spotify":       generate_spotify,
    "calendar":      generate_calendar,
    "paypal":        generate_paypal,
    "crypto":        generate_crypto,
    "upi":           generate_upi,
    "facebook":      lambda p: generate_simple_url(p, "https://facebook.com"),
    "instagram":     lambda p: generate_simple_url(p, "https://instagram.com"),
    "twitter":       lambda p: generate_simple_url(p, "https://x.com"),
    "tiktok":        lambda p: generate_simple_url(p, "https://tiktok.com/@"),
    "linkedin":      lambda p: generate_simple_url(p, "https://linkedin.com/in"),
    "telegram":      lambda p: f"https://t.me/{p.get('username','').lstrip('@')}",
    "reddit":        lambda p: generate_simple_url(p, "https://reddit.com/u"),
    "amazon":        lambda p: p.get("url", "https://amazon.com"),
    "wechat":        lambda p: p.get("url", ""),
    "snapchat":      lambda p: f"https://snapchat.com/add/{p.get('username','')}",
    "venmo":         lambda p: f"https://venmo.com/{p.get('username','')}",
    "etsy":          lambda p: p.get("url", "https://etsy.com"),
    "linktree":      lambda p: f"https://linktr.ee/{p.get('username','')}",
    "line":          lambda p: p.get("url", ""),
    "kakaotalk":     lambda p: p.get("url", ""),
    "googledoc":     lambda p: p.get("url", ""),
    "googleforms":   lambda p: p.get("url", ""),
    "googlesheets":  lambda p: p.get("url", ""),
    "googlereview":  lambda p: p.get("url", ""),
    "office365":     lambda p: p.get("url", ""),
    "pptx":          lambda p: p.get("url", ""),
    "excel":         lambda p: p.get("url", ""),
    "archivo":       lambda p: p.get("url", ""),
    "png":           lambda p: p.get("url", ""),
    "pdf":           lambda p: p.get("url", ""),
    "video":         lambda p: p.get("url", ""),
    "logo":          lambda p: p.get("url", ""),
    "shaped":        lambda p: p.get("url", ""),
    "booking":       lambda p: p.get("url", ""),
    "pcr":           lambda p: p.get("data", ""),
    "barcode2d":     lambda p: p.get("data", ""),
}


def generate_qr_content(qr_type: str, payload: dict) -> str:
    """
    Genera el string que se codificará en el QR según el tipo.
    SWEBOK: Single Responsibility — cada tipo tiene su propio generador.
    """
    generator = GENERATORS.get(qr_type)
    if not generator:
        return payload.get("url", payload.get("text", ""))
    try:
        return generator(payload)
    except Exception:
        return str(payload)
