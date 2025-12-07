import requests
import json
from datetime import datetime
from pathlib import Path

# --- CONFIGURATION ---
BASE_URL = "http://127.0.0.1:8000/api"

RESULTS_DIR = Path("api_results")
RESULTS_DIR.mkdir(exist_ok=True)

JSON_FILE = RESULTS_DIR / "results.json"
LOG_FILE = RESULTS_DIR / "results.log"

results_store = {}


# --- UTILITIES ---

def log_event(title, status):
    """Logs the result of an API call to a file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {title} -> {status}\n")


def save_result(title, request_payload, response):
    """Stores the request and response in the global dict and writes to JSON."""
    try:
        data = response.json()
    except requests.exceptions.JSONDecodeError:
        data = response.text

    results_store[title] = {
        "status": response.status_code,
        "request": request_payload,
        "response": data
    }

    with open(JSON_FILE, "w") as f:
        json.dump(results_store, f, indent=4)

    log_event(title, response.status_code)


def pretty(title, response):
    """Prints the response status and body nicely."""
    print(f"\n{'=' * 12} {title} {'=' * 12}")
    print("STATUS:", response.status_code)
    try:
        print(json.dumps(response.json(), indent=4))
    except requests.exceptions.JSONDecodeError:
        print(response.text)


# -------------------------------
# AUTHENTICATION & REGISTRATION
# -------------------------------

def register_admin():
    """Registers an Admin and returns the JWT access token and user ID."""
    payload = {
        "username": "admin1",
        "email": "admin1@test.com",
        "password": "StrongPass123!",
        "password2": "StrongPass123!"
    }

    # CRITICAL: Assuming new endpoint /auth/register/admin/ exists
    r = requests.post(f"{BASE_URL}/auth/register/admin/", json=payload)
    save_result("REGISTER_ADMIN", payload, r)
    pretty("REGISTER ADMIN", r)

    if r.status_code != 201:
        raise Exception(f"Admin registration failed with status {r.status_code}: {r.text}")

    data = r.json()
    return data["access"], data["user"]["id"]


def register_coach():
    """Registers a coach and returns the JWT access token and user ID."""
    payload = {
        "username": "coach1",
        "email": "coach1@test.com",
        "password": "StrongPass123!",
        "password2": "StrongPass123!"
    }

    r = requests.post(f"{BASE_URL}/auth/register/coach/", json=payload)
    save_result("REGISTER_COACH", payload, r)
    pretty("REGISTER COACH", r)

    if r.status_code != 201:
        raise Exception(f"Coach registration failed with status {r.status_code}: {r.text}")

    data = r.json()
    return data["access"], data["user"]["id"]


def register_player():
    """Registers a player and returns the JWT access token and user ID."""
    payload = {
        "username": "player1",
        "email": "player1@test.com",
        "password": "StrongPass123!",
        "password2": "StrongPass123!"
    }

    r = requests.post(f"{BASE_URL}/auth/register/player/", json=payload)
    save_result("REGISTER_PLAYER", payload, r)
    pretty("REGISTER PLAYER", r)

    if r.status_code != 201:
        raise Exception(f"Player registration failed with status {r.status_code}: {r.text}")

    data = r.json()
    return data["access"], data["user"]["id"]


def create_player_profile(token):
    """Updates/Creates the PlayerProfile object using PATCH /profiles/."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "height": 180.5,
        "rating": 75,
        "team_name": "Unassigned"
    }

    r = requests.patch(f"{BASE_URL}/profiles/", json=payload, headers=headers)
    save_result("CREATE_PLAYER_PROFILE", payload, r)
    pretty("CREATE PLAYER PROFILE", r)

    if r.status_code not in (200, 201):
        raise Exception(f"Player profile creation/update failed: {r.status_code} - {r.text}")

    data = r.json()
    return data['id']


# -------------------------------
# TEAMS
# -------------------------------

def create_team(admin_token, coach_user_id):
    """
    Admin creates the team record (admin_owner), assigning the Coach's ID
    to the current_coach field.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "U18 Admin Owned Team",
        # CRITICAL: Send the coach's ID for the current_coach field
        "current_coach": coach_user_id
    }

    r = requests.post(f"{BASE_URL}/teams/", json=payload, headers=headers)
    save_result("CREATE_TEAM_BY_ADMIN", payload, r)
    pretty("CREATE TEAM BY ADMIN", r)

    if r.status_code != 201:
        raise Exception(f"Team creation failed with status {r.status_code}: {r.text}")

    # CRITICAL: Ensure TeamWriteSerializer returns 'id'
    return r.json()["id"]


# -------------------------------
# TRAINING SESSIONS
# -------------------------------

def create_training(admin_token, team_id):
    """Admin creates a training session."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "focus": "Speed & Agility",
        "duration_minutes": 60,
        "team": team_id
    }

    r = requests.post(f"{BASE_URL}/trainings/", json=payload, headers=headers)
    save_result("CREATE_SESSION_BY_ADMIN", payload, r)
    pretty("CREATE SESSION BY ADMIN", r)

    if r.status_code != 201:
        raise Exception(f"Training session creation failed: {r.status_code} - {r.text}")

    return r.json()["id"]


def assign_players(admin_token, session_id, player_ids):
    """Admin assigns players to the session."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"players": player_ids}

    r = requests.patch(
        f"{BASE_URL}/trainings/{session_id}/",
        json=payload,
        headers=headers
    )

    save_result("ASSIGN_PLAYERS", payload, r)
    pretty("ASSIGN PLAYERS", r)

    if r.status_code != 200:
        raise Exception(f"Player assignment failed: {r.status_code} - {r.text}")


def delete_training(admin_token, session_id):
    """Admin deletes the training session."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    r = requests.delete(
        f"{BASE_URL}/trainings/{session_id}/",
        headers=headers
    )

    save_result("DELETE_SESSION", None, r)
    pretty("DELETE SESSION", r)

    if r.status_code != 204:
        raise Exception(f"Training session deletion failed: {r.status_code} - {r.text}")


# -------------------------------
# PERMISSION FAIL TEST
# -------------------------------

def illegal_create_training(player_token):
    """Tests that a Player CANNOT create a training session (403 expected)."""
    headers = {"Authorization": f"Bearer {player_token}"}

    payload = {"focus": "Hack", "duration_minutes": 10}

    r = requests.post(
        f"{BASE_URL}/trainings/",
        json=payload,
        headers=headers
    )

    save_result("PLAYER_CREATE_TRAINING_SHOULD_FAIL", payload, r)
    pretty("PLAYER CREATE TRAINING (FAIL EXPECTED)", r)


# -------------------------------
# MAIN FLOW EXECUTION
# -------------------------------

def main():
    """Executes the full API test flow."""
    try:
        # --- PHASE 1: SETUP ---
        print("--- PHASE 1: SETUP (Registration and Creation) ---")

        # 1. REGISTER ALL USERS
        admin_token, admin_user_id = register_admin()
        coach_token, coach_user_id = register_coach()
        player_token, player_user_id = register_player()

        # 2. CREATE PLAYER PROFILE (Needed for M2M assignments)
        player_profile_id = create_player_profile(player_token)

        # 3. CREATE TEAM & SESSION (Admin acts as the stable admin_owner)
        team_id = create_team(admin_token, coach_user_id)
        session_id = create_training(admin_token, team_id)

        # --- PHASE 2: OPERATIONS ---
        print("\n--- PHASE 2: OPERATIONS (Assignment) ---")

        # 4. ASSIGN PLAYERS (Admin assigns)
        assign_players(admin_token, session_id, [player_profile_id])

        # --- PHASE 3: PERMISSIONS ---
        print("\n--- PHASE 3: PERMISSIONS (Failure Check) ---")

        # Test the critical permission check (Player must be denied)
        illegal_create_training(player_token)

        # --- PHASE 4: CLEANUP ---
        print("\n--- PHASE 4: CLEANUP (Delete) ---")
        # Admin is the creator/owner and deletes the session
        delete_training(admin_token, session_id)

        print("\n✅ API TEST SCRIPT COMPLETED SUCCESSFULLY.")
        print("   - All results saved to:")
        print("   -", JSON_FILE)
        print("   -", LOG_FILE)

    except Exception as e:
        log_event("FATAL_ERROR", str(e))
        print("\n❌ API TEST SCRIPT CRASHED DUE TO UNEXPECTED ERROR.")
        print("   - ERROR:", str(e))
        print("   - Check the log file for the last successful step.")


if __name__ == "__main__":
    if LOG_FILE.exists():
        LOG_FILE.unlink()

    main()