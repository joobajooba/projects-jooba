import json
import urllib.request
from urllib.parse import urlencode

CONTRACT = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029"
HEADERS = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
OUT_JSON = r"C:\Users\lucas\Documents\projects-jooba\scripts\_impz_holders_snapshot.json"
OUT_SQL = r"C:\Users\lucas\Documents\projects-jooba\scripts\_impz_xp_snapshot_rows.sql"


def floor_xp(qty: int) -> int:
    if qty >= 20:
        return 900
    if qty >= 10:
        return 300
    return 0


def floor_level(qty: int) -> int:
    if qty >= 20:
        return 3
    if qty >= 10:
        return 2
    return 1


by: dict[str, int] = {}
page = 1
offset = 100

while True:
    qs = urlencode(
        {
            "module": "token",
            "action": "getTokenHolders",
            "contractaddress": CONTRACT,
            "page": page,
            "offset": offset,
        }
    )
    url = "https://robinhoodchain.blockscout.com/api?" + qs
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=90) as response:
        payload = json.loads(response.read().decode())
    if payload.get("message") != "OK":
        raise SystemExit(f"bad response on page {page}: {payload}")
    rows = payload.get("result") or []
    if not rows:
        break
    for row in rows:
        address = str(row.get("address", "")).lower()
        try:
            qty = int(row.get("value") or 0)
        except ValueError:
            qty = 0
        if address and qty > 0:
            by[address] = max(by.get(address, 0), qty)
    print(f"page {page} got {len(rows)} unique {len(by)}")
    if len(rows) < offset:
        break
    page += 1
    if page > 50:
        break

qualified = [
    {
        "wallet_address": address,
        "impz_count": qty,
        "floor_xp": floor_xp(qty),
        "floor_level": floor_level(qty),
    }
    for address, qty in by.items()
    if qty >= 10
]
qualified.sort(key=lambda row: (-row["impz_count"], row["wallet_address"]))

summary = {
    "holders": len(by),
    "qualified": len(qualified),
    "l3": sum(1 for row in qualified if row["floor_level"] == 3),
    "l2": sum(1 for row in qualified if row["floor_level"] == 2),
    "top": qualified[:12],
}
print(json.dumps(summary, indent=2))

payload = {
    "snapped_at": "2026-08-21",
    "contract": CONTRACT,
    "holders": [
        {"wallet_address": address, "impz_count": qty}
        for address, qty in sorted(by.items())
    ],
    "qualified": qualified,
}
with open(OUT_JSON, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2)

values = [
    f"('{row['wallet_address']}', {row['impz_count']}, {row['floor_xp']}, {row['floor_level']})"
    for row in qualified
]
with open(OUT_SQL, "w", encoding="utf-8") as handle:
    handle.write(",\n".join(values))

print("wrote", OUT_JSON)
print("sql rows", len(values))
