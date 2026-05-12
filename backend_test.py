"""
Backend test for 2-Day Reminder system.
Tests endpoints under backend_v2 in test_result.md.
"""
import os
import sys
import time
import requests

BASE = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
assert BASE, "EXPO_PUBLIC_BACKEND_URL not found"
API = BASE.rstrip("/") + "/api"
print(f"Using API base: {API}")

PASS, FAIL = [], []


def record(ok, name, detail=""):
    (PASS if ok else FAIL).append((name, detail))
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}: {detail}")


def login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=20)
    if r.status_code != 200:
        record(False, f"login {username}", f"HTTP {r.status_code} {r.text[:200]}")
        return None
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


print("\n=== Logging in users ===")
tk_caseworker = login("caseworker", "case123")
tk_admin = login("admin", "admin123")
tk_sp = login("sp", "sp123")
tk_forest = login("forest", "forest123")
tk_adc = login("adc", "adc123")
tk_dc = login("dc", "dc123")
tk_tah = login("tah_mangaluru", "tah123")

if not all([tk_caseworker, tk_admin, tk_sp, tk_forest, tk_adc, tk_dc, tk_tah]):
    print("Some logins failed; aborting.")
    sys.exit(1)
record(True, "All logins", "caseworker/admin/sp/forest/adc/dc/tah_mangaluru OK")

unique_suffix = str(int(time.time()))[-6:]
file_no = f"REM{unique_suffix}"
print(f"\n=== Creating file file_no={file_no} ===")
payload = {
    "file_no": file_no,
    "year": "2026",
    "description": "Reminder test",
    "tahsildar_location": "Mangaluru",
    "departments": ["tahsildar", "sp", "forest"],
    "priority": "high",
}
r = requests.post(f"{API}/files", json=payload, headers=auth(tk_caseworker), timeout=20)
if r.status_code != 200:
    record(False, "create file", f"HTTP {r.status_code} {r.text[:300]}")
    sys.exit(1)
file_data = r.json()
file_id = file_data["id"]
file_number = file_data["file_number"]
record(True, "create file", f"id={file_id} file_number={file_number}")

r = requests.post(f"{API}/files/{file_id}/submit", headers=auth(tk_caseworker), timeout=20)
record(r.status_code == 200, "submit file", f"HTTP {r.status_code} {r.text[:200]}")

print("\n=== trigger-reminders as admin (expect 0) ===")
r = requests.post(f"{API}/admin/trigger-reminders", headers=auth(tk_admin), timeout=30)
if r.status_code == 200:
    body = r.json()
    rs = body.get("reminders_sent")
    record(rs == 0, "trigger-reminders returns reminders_sent=0", f"resp={body}")
    record("message" in body and "reminders_sent" in body, "response shape has message+reminders_sent",
           f"keys={list(body.keys())}")
else:
    record(False, "trigger-reminders admin call", f"HTTP {r.status_code} {r.text[:200]}")

for who, tk in [("caseworker", tk_caseworker), ("sp", tk_sp)]:
    r = requests.post(f"{API}/admin/trigger-reminders", headers=auth(tk), timeout=15)
    record(r.status_code == 403, f"trigger-reminders 403 for {who}", f"HTTP {r.status_code}")

print("\n=== force-reminder as admin (expect 3) ===")
r = requests.post(f"{API}/admin/force-reminder/{file_id}", headers=auth(tk_admin), timeout=30)
if r.status_code == 200:
    body = r.json()
    rs = body.get("reminders_sent")
    record(rs == 3, "force-reminder reminders_sent==3", f"resp={body}")
else:
    record(False, "force-reminder admin call", f"HTTP {r.status_code} {r.text[:300]}")

r = requests.post(f"{API}/admin/force-reminder/{file_id}", headers=auth(tk_sp), timeout=15)
record(r.status_code == 403, "force-reminder 403 for sp", f"HTTP {r.status_code}")

r = requests.post(f"{API}/admin/force-reminder/nonexistent-id-xyz", headers=auth(tk_admin), timeout=15)
record(r.status_code == 404, "force-reminder 404 for unknown file_id", f"HTTP {r.status_code}")

print("\n=== force-reminder 400 for draft ===")
draft_payload = {
    "file_no": f"DRAFT{unique_suffix}",
    "year": "2026",
    "description": "Draft test",
    "tahsildar_location": "Mangaluru",
    "departments": ["sp"],
    "priority": "normal",
}
r = requests.post(f"{API}/files", json=draft_payload, headers=auth(tk_caseworker), timeout=15)
if r.status_code == 200:
    draft_id = r.json()["id"]
    r2 = requests.post(f"{API}/admin/force-reminder/{draft_id}", headers=auth(tk_admin), timeout=15)
    record(r2.status_code == 400, "force-reminder 400 for draft", f"HTTP {r2.status_code} {r2.text[:200]}")
else:
    record(False, "create draft file", f"HTTP {r.status_code}")


def get_notifs(tk):
    r = requests.get(f"{API}/notifications", headers=auth(tk), timeout=15, params={"limit": 200})
    return r.json() if r.status_code == 200 else []


def find_for_file(notifs, fn, predicate):
    return [n for n in notifs if n.get("file_number") == fn and predicate(n)]


print("\n=== Verify notifications ===")
sp_notifs = get_notifs(tk_sp)
matches = find_for_file(sp_notifs, file_number,
                        lambda n: n.get("type") == "reminder" and n.get("title") == "Reminder: Pending Review")
record(len(matches) >= 1, "SP sees dept reminder notification",
       f"matches={len(matches)} sample={matches[0] if matches else None}")
if matches:
    record(file_number in matches[0].get("message", ""), "SP reminder message contains file_number",
           f"msg={matches[0].get('message')}")
    record(matches[0].get("target_role") == "sp", "SP reminder target_role=='sp'",
           f"target_role={matches[0].get('target_role')}")

forest_notifs = get_notifs(tk_forest)
forest_matches = find_for_file(forest_notifs, file_number,
                               lambda n: n.get("type") == "reminder" and n.get("title") == "Reminder: Pending Review")
record(len(forest_matches) >= 1, "Forest sees dept reminder",
       f"matches={len(forest_matches)}")
if forest_matches:
    record(forest_matches[0].get("target_role") == "forest_officer",
           "Forest reminder target_role=='forest_officer'",
           f"target_role={forest_matches[0].get('target_role')}")

tah_notifs = get_notifs(tk_tah)
tah_matches = find_for_file(tah_notifs, file_number,
                            lambda n: n.get("type") == "reminder" and n.get("title") == "Reminder: Pending Review")
record(len(tah_matches) >= 1, "Tahsildar Mangaluru sees dept reminder",
       f"matches={len(tah_matches)}")
if tah_matches:
    record(tah_matches[0].get("target_department") == "Mangaluru",
           "Tahsildar reminder target_department=='Mangaluru'",
           f"target_department={tah_matches[0].get('target_department')}")

adc_notifs = get_notifs(tk_adc)
adc_matches = find_for_file(adc_notifs, file_number,
                            lambda n: n.get("type") == "reminder_oversight" and n.get("title", "").startswith("Pending >2 Days"))
record(len(adc_matches) >= 3, "ADC sees 3 oversight reminders",
       f"matches={len(adc_matches)} titles={[m.get('title') for m in adc_matches]}")

adc_titles = {m.get("title") for m in adc_matches}
expected_titles = {"Pending >2 Days — SP", "Pending >2 Days — Forest", "Pending >2 Days — Tahsildar (Mangaluru)"}
record(expected_titles.issubset(adc_titles), "ADC oversight has SP/Forest/Tahsildar(Mangaluru) titles",
       f"actual={adc_titles}")

dc_notifs = get_notifs(tk_dc)
dc_matches = find_for_file(dc_notifs, file_number,
                           lambda n: n.get("type") == "reminder_oversight" and n.get("title", "").startswith("Pending >2 Days"))
record(len(dc_matches) >= 3, "DC sees 3 oversight reminders", f"matches={len(dc_matches)}")

admin_notifs = get_notifs(tk_admin)
admin_matches = find_for_file(admin_notifs, file_number,
                              lambda n: n.get("type") == "reminder_oversight" and n.get("title", "").startswith("Pending >2 Days"))
record(len(admin_matches) >= 3, "Admin sees 3 oversight reminders", f"matches={len(admin_matches)}")

print("\n=== Check backend logs for push attempts ===")
import subprocess
try:
    log_out = subprocess.run(
        ["bash", "-c", "tail -n 800 /var/log/supervisor/backend.err.log /var/log/supervisor/backend.out.log 2>/dev/null"],
        capture_output=True, text=True, timeout=10
    ).stdout
    push_lines = [l for l in log_out.splitlines() if "Push notification" in l]
    record(len(push_lines) >= 1, "Backend logs show 'Push notification' attempts after force-reminder",
           f"count={len(push_lines)} sample={push_lines[-1][:200] if push_lines else 'none'}")
except Exception as e:
    record(False, "Backend log check", f"error={e}")

print("\n=== Second trigger-reminders (should still be 0) ===")
r = requests.post(f"{API}/admin/trigger-reminders", headers=auth(tk_admin), timeout=20)
if r.status_code == 200:
    record(r.json().get("reminders_sent") == 0,
           "Second trigger-reminders returns 0 (last_reminder_at fresh)",
           f"resp={r.json()}")

print("\n" + "=" * 80)
print(f"PASSED: {len(PASS)}  FAILED: {len(FAIL)}")
if FAIL:
    print("\nFAILURES:")
    for n, d in FAIL:
        print(f"  FAIL {n}: {d}")
sys.exit(0 if not FAIL else 1)
