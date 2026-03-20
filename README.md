# OnyxFlow

# Decoupled Sports Team Management API

This project is a RESTful API built with Django and Django REST Framework (DRF) designed for organizational administrators, coaches, and athletes to manage teams, schedule training sessions, and track performance metrics. The architecture is fully **decoupled**, making the API the single source of truth for both web and mobile clients. 

---

## Project Goals and Technical Focus

The primary technical goal is to build a robust and secure foundation by mastering advanced DRF techniques:

1.  **Refined Role-Based Access Control (RBAC):** Implementation of three distinct user roles (**Admin**, **Coach**, **Player**) with clear separation of duties.
2.  **Decoupled Model Ownership:** Structuring the **`Team`** model to separate stable **ownership** (`admin_owner`) from the volatile **coaching role** (`current_coach`). This allows teams to persist even if a coach leaves.
3.  **Decoupled Authentication:** Securing all endpoints using **JSON Web Tokens (JWT)** for stateless, multi-client security.
4.  **Data Integrity:** Enforcing complex data relationships and automated processes (e.g., profile creation) using **Django Signals**.

---

## 🛠️ Core Functionality and Features

| Feature Area | Description | Technical Implementation |
| :--- | :--- | :--- |
| **User Management** | Allows registration for three distinct roles: **Admin**, **Coach**, and **Player**. | Custom `User` Model, JWT Authentication, new registration views/serializers for each role. |
| **Team Management** | **Admins** and **Coaches** can create teams (becoming the `admin_owner`). The `current_coach` can be assigned/changed without affecting the team record. | **`TeamListCreateView`** and **`TeamDetailView`**. `admin_owner` and `current_coach` fields replace the single `coach` field. |
| **Training Sessions** | **Admins** and **Coaches** can schedule sessions, define focus/duration, and assign sessions to teams or players. | Permission checks in the view ensure only Admins/Coaches can perform `POST/PATCH/DELETE` operations. |
| **Profile Self-Service** | Players can view and update their own profile details (e.g., height). | **`RetrieveUpdateDestroyAPIView`** with `get_object()` override for self-service profile access. |
| **Permissions** | Enforces that Players can only view assigned data, while Admins/Coaches have creation/modification rights. | Custom DRF Permission classes (`IsTeamOwner`, `IsAdminCoachOrAssignedPlayer`) check for multiple roles. |

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

Ensure your `settings.py` is configured correctly. **Note:** Due to the role changes, you must ensure the latest migrations are applied.

```bash
# Apply migrations to create the database schema 
python manage.py makemigrations 
python manage.py migrate
```

### 5\. Run the Server

```bash
python manage.py runserver
```

The API should now be running locally at `http://127.0.0.1:8000/api/`.

-----

## 🔑 Authentication and Endpoints

All data endpoints require a JWT **Access Token** in the `Authorization` header: `Authorization: Bearer <TOKEN>`.

### Authentication Endpoints (Permission: `AllowAny`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register/admin/` | Creates a new **Admin** user and returns JWT tokens. |
| `POST` | `/api/auth/register/coach/` | Creates a new **Coach** user and returns JWT tokens. |
| `POST` | `/api/auth/register/player/` | Creates a new **Player** user and returns JWT tokens. |

### Core API Endpoints (Permission: `IsAuthenticated` + RBAC)

| Resource | Method | Endpoint | Admin/Coach Access | Player Access |
| :--- | :--- | :--- | :--- | :--- |
| **Profile** | `GET/PATCH` | `/api/profiles/` | View/Update only own profile. | **View/Update only own profile.** |
| **Teams** | `POST/GET` | `/api/teams/` | Full CRUD. | `GET` only teams player is assigned to. |
| **Teams** | `GET/PATCH/DEL`| `/api/teams/{id}/` | **Only if team `admin_owner`.** | Denied (Read access handled by list view). |
| **Training** | `POST/GET` | `/api/trainings/` | Full CRUD. | `GET` only sessions player is assigned to. |
| **Training** | `GET/PATCH/DEL`| `/api/trainings/{id}/` | Full CRUD (via role check). | `GET` only. **Modification denied (403).** |

-----

## 🧪 Testing and Verification

The project includes a robust integration test script (`api_test.py`) to verify all core functionalities and security permissions across all three roles.

### Run Tests

```bash
python api_test.py
```

### Key Security Verifications

  * **Role Enforcement:** Tests confirm that only **Admin** or **Coach** users can successfully create teams and training sessions.
  * **Decoupled Ownership:** Tests verify that team modification/deletion is restricted solely to the **`admin_owner`** (not the `current_coach` if they are different).
  * **403 Forbidden:** Ensures the script returns a **403 Forbidden** status when a Player attempts an unauthorized action.

<!-- end list -->
