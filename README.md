# OnyxFlow

# Decoupled Team Management API

This project is a RESTful API built with Django and Django REST Framework (DRF) designed for coaches and players to manage teams, schedule training sessions, and track performance metrics. The architecture is fully decoupled, making the API the single source of truth for both web and mobile clients. 

---

## Project Goals and Technical Focus

The primary technical goal is to build a robust and secure foundation by mastering advanced DRF techniques:

1.  **Role-Based Access Control (RBAC):** Implementing fine-grained permissions to strictly differentiate capabilities between **Coach** (manager/creator) and **Player** (participant/reader).
2.  **Decoupled Authentication:** Securing all endpoints using **JSON Web Tokens (JWT)** for stateless, multi-client security.
3.  **Data Integrity:** Enforcing complex data relationships and automated processes (e.g., profile creation) using **Django Signals**. 

---

## 🛠️ Core Functionality and Features

| Feature Area | Description | Technical Implementation |
| :--- | :--- | :--- |
| **User Management** | Allows registration for two distinct roles: Coach and Player. | Custom `User` Model, JWT Authentication, `post_save` Signal for auto-creating `PlayerProfile`. |
| **Team Management** | Coaches can create, update, and manage teams. Coaches can assign existing players to their teams. | **`TeamListCreateView`** and **`TeamDetailView`**. Ensures coach ownership during creation. |
| **Training Sessions** | Coaches can schedule sessions, define focus/duration, and assign sessions to teams or players. | **`TrainingWriteSerializer`** with custom validation to ensure coaches only assign sessions to their own teams. |
| **Profile Self-Service** | Players can view and update their own profile details (e.g., height). | **`RetrieveUpdateDestroyAPIView`** with `get_object()` override to enforce self-service profile access. |
| **Permissions** | Enforces that Players can only view sessions they are assigned to, and only Coaches can create/delete/modify core resources. | Custom DRF Permission classes (`IsTeamCoach`, `IsCoachOrAssignedPlayer`). |

---

## 💻 Setup and Installation

### 1. Prerequisites
You must have Python 3.11+ and `pip` installed.

### 2. Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# .\venv\Scripts\activate  # On Windows


### 3\. Install Dependencies

Install all required packages (Django, DRF, simplejwt, requests, etc.).

```bash
pip install -r requirements.txt
```

### 4\. Database Setup

Ensure your `settings.py` is configured correctly.

```bash
# Apply migrations to create the database schema (User, Team, Session, etc.)
python manage.py makemigrations 
python manage.py migrate
```

### 5\. Run the Server

```bash
python manage.py runserver
```

The API should now be running locally at `http://127.0.0.1:8000/api/`.

-----

## Authentication and Endpoints

All data endpoints require a JWT **Access Token** in the `Authorization` header: `Authorization: Bearer <TOKEN>`.

### Authentication Endpoints (Permission: `AllowAny`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register/coach/` | Creates a new Coach user and returns JWT tokens. |
| `POST` | `/api/auth/register/player/` | Creates a new Player user and returns JWT tokens. |

### Core API Endpoints (Permission: `IsAuthenticated` + RBAC)

| Resource | Method | Endpoint | Coach Access | Player Access |
| :--- | :--- | :--- | :--- | :--- |
| **Profile** | `GET/PATCH` | `/api/profiles/` | Full access to own profile (Update). | **View/Update only own profile.** |
| **Teams** | `POST/GET` | `/api/teams/` | Full CRUD. | `GET` only teams player is assigned to. |
| **Teams** | `GET/PATCH/DEL`| `/api/teams/{id}/` | **Only if team coach.** | Denied (Read access handled by list view). |
| **Training** | `POST/GET` | `/api/trainings/` | Full CRUD. | `GET` only sessions player is assigned to. |
| **Training** | `GET/PATCH/DEL`| `/api/trainings/{id}/` | Full CRUD (via ownership check). | `GET` only. **Modification denied (403).** |

-----

## Testing and Verification

The project includes a robust integration test script to verify core functionalities and security permissions.

### Run Tests

```bash
python api_test.py
```

### Key Security Verifications

  * **Role Enforcement:** Confirms that only Coach users can successfully create teams and training sessions.
  * **Data Integrity:** Verifies successful profile creation via the signal handler.
  * **403 Forbidden:** Ensures the script returns a **403 Forbidden** status when a Player attempts an unauthorized action (`illegal_create_training` test).

<!-- end list -->