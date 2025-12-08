# Part Management System - Flow Overview

> Visual flows with consistent color themes and quick-reading legends.

Legend: 🟦 Frontend · 🟪 Backend · 🟩 Data/DB · 🟧 Files · 🟨 Build/Deploy

---

## System Architecture Flow

```mermaid
graph TB
    %% Clusters
    subgraph "Frontend (Browser) 🟦"
        UI[UI Shell]
        AuthModal[Auth Modal]
        Tabs[Workflow Tabs]
        Modals[CRUD Modals]
        State[State Store]
    end

    subgraph "Backend (Flask API) 🟪"
        API[REST Routes]
        Auth[API Key Guard]
        Models[ORM Models]
        Utils[Utilities]
    end

    subgraph "Database 🟩"
        DB[(Parts Table)]
    end

    subgraph "File Storage 🟧"
        Uploads[Upload Dir]
        Converted[GLB Output]
    end

    %% Flows
    UI --> AuthModal
    AuthModal --> API
    UI --> Tabs --> Modals --> State --> API
    API --> Auth --> Models --> DB
    API --> Utils
    Utils --> Uploads
    Utils --> Converted

    %% Styling
    classDef fe fill:#e3f2fd,stroke:#60a5fa,stroke-width:1px;
    classDef be fill:#f3e8ff,stroke:#a855f7,stroke-width:1px;
    classDef db fill:#dcfce7,stroke:#22c55e,stroke-width:1px;
    classDef fs fill:#fff7ed,stroke:#fb923c,stroke-width:1px;
    class UI,AuthModal,Tabs,Modals,State fe;
    class API,Auth,Models,Utils be;
    class DB db;
    class Uploads,Converted fs;
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database

    U->>FE: Load app
    FE->>BE: GET /api/parts/ (check auth)
    alt Missing/Bad key
        BE-->>FE: 401 Unauthorized
        FE->>U: Show auth modal
        U->>FE: Enter API key
    end
    FE->>BE: Validate API key
    BE->>DB: Verify secret
    DB-->>BE: OK
    BE-->>FE: 200 + parts
    FE->>U: Render dashboard
```

---

## Part Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Review: Created
    Review --> CNC: Approve CNC
    Review --> Hand: Approve Hand
    CNC --> InProgress: Assign
    Hand --> InProgress: Assign
    InProgress --> Completed: Complete
    Completed --> [*]: Archive
    InProgress --> Review: Unclaim
    CNC --> Review: Reassign
    Hand --> Review: Reassign

    state Review {
        [*] --> Waiting
        Waiting --> Triaged: Approved
    }

    note right of CNC
        CNC/Laser machining
        File downloads enabled
    end note

    note right of Hand
        Manual fabrication lane
    end note

    note right of Completed
        Historical record
    end note
```

---

## Part Creation Flow

```mermaid
flowchart TD
    A[Click Add] --> B[Open Add Modal]
    B --> C[Fill Fields]
    C --> D{Required ok?\nID · Material · Subsystem}
    D -- No --> E[Show inline errors]
    E --> C
    D -- Yes --> F[Optional fields\nname/type/notes/etc.]
    F --> G[Upload files?]
    G --> H[Submit]
    H --> I{Validate}
    I -- Fail --> E
    I -- Pass --> J[POST /api/parts]
    J --> K[Create record]
    K --> L[Update state]
    L --> M[Refresh UI + toast]

    classDef good fill:#dcfce7,stroke:#22c55e;
    classDef warn fill:#fef9c3,stroke:#f59e0b;
    classDef bad fill:#fee2e2,stroke:#ef4444;
    class D good;
    class E bad;
    class L,M good;
```

---

## File Upload and Conversion Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant FS as File System
    participant CONV as Converter

    U->>FE: Choose STEP file
    FE->>BE: POST /api/parts/{id}/upload
    BE->>FS: Save file
    FS-->>BE: Saved
    BE-->>FE: Upload OK
    Note over FE,BE: UI shows filename + success

    U->>FE: Request 3D view
    FE->>BE: POST /api/parts/{id}/convert
    BE->>CONV: step_to_glb(...)
    CONV->>FS: Write GLB
    FS-->>CONV: Done
    CONV-->>BE: GLB path
    BE-->>FE: Conversion result
    FE->>U: Render 3D model
```

---

## API Communication Flow

```mermaid
flowchart LR
    subgraph FE["Frontend Calls 🟦"]
        A1[partsApi.js\n(high-level)]
        A2[apiClient.js\n(fetch wrapper)]
        A3[auth.js\ncookies + key]
    end

    subgraph BE["Backend Routes 🟪"]
        B1[Blueprint: parts_bp]
        B2[Auth middleware]
        B3[File handlers]
    end

    subgraph DB["Data Layer 🟩"]
        C1[Part Model]
        C2[SQLAlchemy]
        C3[SQLite]
    end

    A1 -->|CRUD| B1
    A2 -->|HTTP| B1
    A3 -->|API key| B2
    B1 --> B3
    B1 --> C1
    C1 --> C2 --> C3
    B3 -.->|Files| FS[(File System 🟧)]

    classDef fe fill:#e3f2fd,stroke:#60a5fa;
    classDef be fill:#f3e8ff,stroke:#a855f7;
    classDef db fill:#dcfce7,stroke:#22c55e;
    classDef fs fill:#fff7ed,stroke:#fb923c;
    class A1,A2,A3 fe;
    class B1,B2,B3 be;
    class C1,C2,C3 db;
    class FS fs;
```

---

## Search and Filter Flow

```mermaid
flowchart TD
    A[Type query] --> B[Live filter]
    B --> C[Category filter]
    C --> D[Match fields:\nname · notes · subsystem · assigned · material · partId]
    D --> E[Apply sort\nalpha/date toggle]
    E --> F[Update UI]
    F --> G[Render results]

    H[Tab click] --> I[Load category]
    I --> C

    J[Sort click] --> K[Toggle direction]
    K --> E

    classDef fe fill:#e3f2fd,stroke:#60a5fa;
    class A,B,C,D,E,F,G,H,I,J,K fe;
```

---

## Deployment Flow

```mermaid
graph TB
    subgraph Dev["Development 🟨"]
        DEV[Local dev]
        DEV_FRONT[npm run dev]
        DEV_BACK[uv run python run.py]
    end

    subgraph Build["Production Build 🟨"]
        BUILD_FRONT[npm run build]
        BUILD_BACK[uv run python deploy.py prod-multi]
    end

    subgraph Runtime["Production Runtime 🟩/🟪"]
        PROD_FRONT[Static host\n(Nginx/etc)]
        PROD_BACK[Gunicorn workers]
        PROD_DB[(SQLite / PostgreSQL)]
    end

    DEV --> BUILD_FRONT
    DEV --> BUILD_BACK
    BUILD_FRONT --> PROD_FRONT
    BUILD_BACK --> PROD_BACK
    PROD_FRONT --> PROD_BACK
    PROD_BACK --> PROD_DB

    classDef dev fill:#e0f2fe,stroke:#38bdf8;
    classDef build fill:#f3e8ff,stroke:#a855f7;
    classDef run fill:#dcfce7,stroke:#22c55e;
    class DEV,DEV_FRONT,DEV_BACK dev;
    class BUILD_FRONT,BUILD_BACK build;
    class PROD_FRONT,PROD_BACK,PROD_DB run;
```

---

## Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B{Authenticated?}
    B -- No --> C[401 Unauthorized]
    C --> C1[Show auth modal]

    B -- Yes --> D{Valid payload?}
    D -- No --> E[400 Bad Request\nfield errors]
    E --> E1[Inline highlights]

    D -- Yes --> F{DB/File op}
    F -- Fail --> H[500 Server Error]
    F -- Success --> G[200 OK]

    G --> G1[Update state + UI]
    H --> H1[Toast/log + retry guidance]

    classDef ok fill:#dcfce7,stroke:#22c55e;
    classDef warn fill:#fef9c3,stroke:#f59e0b;
    classDef bad fill:#fee2e2,stroke:#ef4444;
    classDef neutral fill:#e5e7eb,stroke:#9ca3af;
    class G,G1 ok;
    class E,E1 warn;
    class C,C1,H,H1 bad;
    class A,B,D,F neutral;
```

---

## Key System Flows Summary

### User Journey
1. **Authenticate** → enter API key and load data.
2. **Discover** → search/filter across categories.
3. **Create** → add parts with validation and uploads.
4. **Advance** → move parts through CNC/Hand to Completed.
5. **Assign** → track ownership and progress.
6. **Complete** → finalize and archive.

### Data Flow
- Frontend state ↔ Backend API ↔ Database.
- File uploads → Conversion service → 3D viewer.
- User actions → State updates → UI re-renders.

### Error Recovery
- Auth failures → prompt for key.
- Validation errors → inline highlights.
- Server issues → graceful messages and retry guidance.
- Network issues → retry after connection check.