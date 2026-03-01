# ShiftSwap AI for WhatsApp - Flowchart

```mermaid
graph TD
    %% Main Entities
    User((Manager))
    Staff((Employee))
    
    %% Systems
    Frontend[React Frontend]
    Backend[Node.js Backend]
    DB[(Firestore DB)]
    WhatsApp[WhatsApp Baileys]
    AI_Bot{AI Negotiator}

    %% Manager Flow
    User -->|Settings, Staff, Shifts| Frontend
    Frontend -->|Reads/Writes| DB
    Frontend -->|Connects Session| Backend
    
    %% Backend Jobs
    Backend -->|Job 1: Availability Reminder| DB
    Backend -->|Job 2: Proactive Gap-Fill| DB
    
    %% DB Hooks/Outbound
    DB --> |Triggers Nudge| WhatsApp
    DB --> |Triggers Gap-Fill Offer| WhatsApp
    
    %% WhatsApp Comm
    WhatsApp <--> |Messaging| Staff
    
    %% AI Flow
    Staff --> |Replies/Cancels| WhatsApp
    WhatsApp --> |Incoming Message| Backend
    Backend --> |Checks Auth/LID| DB
    Backend --> |Passes to AI| AI_Bot
    AI_Bot --> |Queries Schedule/Rules| DB
    AI_Bot --> |Generates Response| WhatsApp
    
    %% specific subflows
    subgraph Proactive Gap-Fill
        Trigger[Every Hour] --> Check[Check Published Understaffed Shifts within warningHours]
        Check --> ApplyHours[Respect botActiveFrom/To]
        ApplyHours --> Find[Find staff matching role]
        Find --> Offer[Send WhatsApp Offer]
    end
    
    subgraph Reactive AI (Cancellation)
        StaffMsg[Staff: 'I am sick'] --> AI[AI Parses Intent: Cancellation]
        AI --> Log[Register Swap Request]
        Log --> FindReplacement[Find Replacement candidate]
        FindReplacement --> OfferSwap[Send WhatsApp Offer]
        OfferSwap --> StaffReply[Wait for 'Yes']
        StaffReply --> Transaction[Assign Swap Transaction]
    end
```
