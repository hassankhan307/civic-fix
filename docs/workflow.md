# CivicFix Workflow & Report Lifecycle

## 1. Lifecycle State Machine

```
[ REPORTED ] ──(Admin Verify)──> [ VERIFIED ] ──(Assign)──> [ ASSIGNED ]
     │                                │                           │
     ├──(Admin Reject)─> [ REJECTED ] ├──(Admin Reject)           │
     │                                │                           ▼
     └──(Merge)───────> [ DUPLICATE ] └──(Start Work)────> [ IN PROGRESS ]
                                                                  │
                                                                  ▼
[ IN PROGRESS ] <──(Citizen Reopens)─────── [ RESOLVED ] <──(Complete Work)
```

## 2. Permitted Transitions Matrix

| Current Status | Permitted Target Statuses | Actor Authorized | Action Description |
| :--- | :--- | :--- | :--- |
| `REPORTED` | `VERIFIED`, `REJECTED`, `DUPLICATE` | Administrator | Triage new report, accept or reject with reason, or link to existing ticket. |
| `VERIFIED` | `ASSIGNED`, `IN_PROGRESS`, `REJECTED`, `DUPLICATE` | Administrator | Assign to municipal department or field staff member. |
| `ASSIGNED` | `IN_PROGRESS`, `RESOLVED`, `REJECTED` | Field Staff / Admin | Field crew begins on-site repairs or completes task. |
| `IN_PROGRESS` | `RESOLVED`, `REJECTED` | Field Staff / Admin | Record resolution notes and upload resolution photo proof. |
| `RESOLVED` | `IN_PROGRESS` | Citizen / Admin | Reopened if citizen tests or inspects site and reports problem persists. |
| `REJECTED` | `REPORTED` | Administrator | Re-open if citizen appeals with additional evidence. |
| `DUPLICATE` | `REPORTED` | Administrator | Un-merge if distinct issue established upon inspection. |

## 3. Transaction & Event Flow
Whenever a status transition occurs:
1. Database record is updated inside an atomic transaction.
2. An immutable audit record is inserted into `ReportStatusHistory` with the actor ID, timestamp, and comment.
3. In-app notification is inserted for the citizen and assigned staff.
4. Typed event `report:status_changed` is emitted over WebSocket to the ticket room (`report_{id}`), citizen room (`user_{id}`), and admin room (`admin_feed`).
