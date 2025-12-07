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
    # Returns the User ID and Access Token
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
    # Returns the User ID and Access Token
    return data["access"], data["user"]["id"]


def create_player_profile(token):
    """
    CRITICAL FIX: Updates/Creates the PlayerProfile object.

    >>> FIX APPLIED: URL changed to use /profiles/
    """
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "height": 180.5,
        "rating": 75,
        "team_name": "Unassigned"
    }

    # FIX APPLIED: Using the correct '/profiles/' endpoint
    r = requests.patch(f"{BASE_URL}/profiles/", json=payload, headers=headers)
    save_result("CREATE_PLAYER_PROFILE", payload, r)
    pretty("CREATE PLAYER PROFILE", r)

    if r.status_code not in (200, 201):
        raise Exception(f"Player profile creation/update failed: {r.status_code} - {r.text}")

    data = r.json()
    # Assuming 'id' is a key in the top-level PlayerSelfSerializer response
    return data['id']


# -------------------------------
# TEAMS
# -------------------------------

def create_team(token):
    """Creates a team as the authenticated coach."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "U18 A Team"}

    r = requests.post(f"{BASE_URL}/teams/", json=payload, headers=headers)
    save_result("CREATE_TEAM", payload, r)
    pretty("CREATE TEAM", r)

    if r.status_code != 201:
        raise Exception(f"Team creation failed with status {r.status_code}: {r.text}")

    return r.json()["id"]


# -------------------------------
# TRAINING SESSIONS
# -------------------------------

def create_training(token, team_id):
    """Creates a training session, matching serializer fields."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "focus": "Speed & Agility",
        "duration_minutes": 60,
        "team": team_id
    }

    r = requests.post(f"{BASE_URL}/trainings/", json=payload, headers=headers)
    save_result("CREATE_SESSION", payload, r)
    pretty("CREATE SESSION", r)

    if r.status_code != 201:
        raise Exception(f"Training session creation failed: {r.status_code} - {r.text}")

    return r.json()["id"]


def assign_players(token, session_id, player_ids):
    """Updates the training session to assign players (using PATCH on Detail View)."""
    headers = {"Authorization": f"Bearer {token}"}

    # Payload sends only the 'players' field to update the ManyToMany relationship
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


def edit_training(token, session_id, team_id):
    """Edits an existing training session."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "focus": "Advanced Speed Training (Updated)",
        "duration_minutes": 90,
        "team": team_id
    }

    r = requests.put(
        f"{BASE_URL}/trainings/{session_id}/",
        json=payload,
        headers=headers
    )

    save_result("EDIT_SESSION", payload, r)
    pretty("EDIT SESSION", r)

    if r.status_code != 200:
        raise Exception(f"Training session edit failed: {r.status_code} - {r.text}")


def delete_training(token, session_id):
    """Deletes a training session."""
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.delete(
        f"{BASE_URL}/trainings/{session_id}/",
        headers=headers
    )

    save_result("DELETE_SESSION", None, r)
    pretty("DELETE SESSION", r)

    if r.status_code != 204:  # 204 No Content is expected for DELETE success
        raise Exception(f"Training session deletion failed: {r.status_code} - {r.text}")


# -------------------------------
# PLAYER PROFILE READS
# -------------------------------

def player_me(token):
    """Player views their own profile (uses PlayerSelfSerializer)."""
    headers = {"Authorization": f"Bearer {token}"}

    # We will assume /players/me/ is used for READ operations for the current user
    # even though /profiles/ is used for the write/patch.
    # If /profiles/me/ is used for ALL operations, change this line:
    r = requests.get(f"{BASE_URL}/players/me/", headers=headers)

    save_result("PLAYER_ME", None, r)
    pretty("PLAYER ME", r)


def coach_view_player(token, player_profile_id):
    """Coach views a player's profile (uses PlayerPublicSerializer)."""
    headers = {"Authorization": f"Bearer {token}"}
    # This endpoint is correctly assumed to be /players/{id}/
    r = requests.get(f"{BASE_URL}/players/{player_profile_id}/", headers=headers)

    save_result("COACH_VIEW_PLAYER", None, r)
    pretty("COACH VIEW PLAYER", r)


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

        # 1. REGISTER USERS
        coach_token, coach_user_id = register_coach()
        player_token, player_user_id = register_player()

        # 2. CREATE PLAYER PROFILE (CRITICAL FIX)
        player_profile_id = create_player_profile(player_token)

        # 3. CREATE TEAM & SESSION
        team_id = create_team(coach_token)
        session_id = create_training(coach_token, team_id)

        # --- PHASE 2: OPERATIONS ---
        print("\n--- PHASE 2: OPERATIONS (Assignment and Updates) ---")

        # 4. ASSIGN PLAYERS using the correct PlayerProfile ID
        assign_players(coach_token, session_id, [player_profile_id])
        edit_training(coach_token, session_id, team_id)

        # --- PHASE 3: READS & PERMISSIONS ---
        print("\n--- PHASE 3: READS & PERMISSIONS ---")
        player_me(player_token)
        coach_view_player(coach_token, player_profile_id)

        # Test the critical permission check (Player must be denied)
        illegal_create_training(player_token)

        # --- PHASE 4: CLEANUP ---
        print("\n--- PHASE 4: CLEANUP (Delete) ---")
        delete_training(coach_token, session_id)

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