import httpx
from typing import Optional, Dict

USER_AGENT = "noc-iq-be/1.0 (+https://example.com)"

def geocode_location(query: str) -> Optional[Dict[str, float]]:
    """
    Geocode a human-readable location name into latitude and longitude using
    OpenStreetMap Nominatim. Returns a dict with keys {"lat", "lon"} as floats,
    or None if not found.

    Note: In production, respect Nominatim's usage policy and consider
    running your own instance or using a paid provider. Tests should mock
    this function to avoid network calls.
    """
    if not query or not query.strip():
        return None

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": USER_AGENT}

    with httpx.Client(timeout=5.0, headers=headers) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        top = data[0]
        try:
            return {"lat": float(top["lat"]), "lon": float(top["lon"]) }
        except Exception:
            return None
