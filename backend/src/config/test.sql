```mermaid
erDiagram
    USERS {
        INT user_id PK
        VARCHAR name
        VARCHAR email
        VARCHAR password_hash
        VARCHAR phone_number
        TEXT health_info
    }
    DOCTORS {
        INT doctor_id PK
        VARCHAR name
        VARCHAR password_hash
        VARCHAR specialization
    }
    MEDICATIONS {
        INT medication_id PK
        INT user_id FK
        DATE date
        INT steps_count
        INT water_intake_ml
        BOOLEAN breakfast_taken
        BOOLEAN lunch_taken
        BOOLEAN dinner_taken
        TEXT notes
    }
    HEALTHHABITS {
        INT habit_id PK
        INT user_id FK
        VARCHAR title
        TEXT description
    }
    REMINDERS {
        INT reminder_id PK
        INT user_id FK
        ENUM call_type
        DATETIME timestamp
    }
    EMERGENCYCALLS {
        INT call_id PK
        INT user_id FK
        INT doctor_id FK
        DATE date
        ENUM call_type
    }
    REWARDS {
        INT reward_id PK
        INT user_id FK
        DATE date
        INT goals_completed
        ENUM reward_level
    }

    MEDICATIONS }|..|| USERS : "user_id"
    HEALTHHABITS }|..|| USERS : "user_id"
    REMINDERS }|..|| USERS : "user_id"
    EMERGENCYCALLS }|..|| USERS : "user_id"
    EMERGENCYCALLS }|..|| DOCTORS : "doctor_id"
    REWARDS }|..|| USERS : "user_id"
```
