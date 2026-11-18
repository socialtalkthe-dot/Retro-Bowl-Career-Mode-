# Security Specification — Retro Bowl Career Mode

## 1. Data Invariants
1. **Master Default-Deny Gate**: No collection or subcollection is accessible unless explicitly matched and authorized.
2. **PII Split Isolation**: User emails and private preferences reside exclusively in `/users/{uid}/private/{docId}` (`docId == 'profile'`), readable and writable strictly by `request.auth.uid == uid` with `email_verified == true` for writes. Public `/rankings/{uid}` documents MUST NEVER accept `email` or any PII field.
3. **Identity & Ownership Integrity**: Every `/rankings/{uid}` create/update must bind `incoming().uid == uid` and `request.auth.uid == uid`. Every `/onlineMatches/{matchId}` write must bind `incoming().hostUid == request.auth.uid` and `request.auth.uid in incoming().participantUids`.
4. **Immutable Audit & Terminal State**: `createdAt` is immutable on `/rankings/{uid}` (`incoming().createdAt == existing().createdAt`). Completed `/onlineMatches/{matchId}` documents are strictly write-once (`allow update, delete: if false`).
5. **Bounded Types, Ranges & Temporal Integrity**: All timestamps must equal `request.time`; ELO is bounded `[100, 4000]`, Legacy Score `[0, 100000]`, `participantUids` bounded `1..10`, `displayName` `1..40` chars, and IDs constrained to `^[a-zA-Z0-9_-]+$`.
6. **Bounded Public List Queries**: `/rankings` list queries evaluate `resource.data.isPublic == true` and require `request.query.limit <= 100`. `/onlineMatches` list queries restrict to `request.auth.uid in resource.data.participantUids`.

## 2. The "Dirty Dozen" Adversarial Payloads
All 12 payloads below MUST return `PERMISSION_DENIED`:
1. **Identity Spoofing on Rankings**: User A attempts `setDoc(/rankings/userB, { uid: 'userB', ... })` -> Denied (`request.auth.uid != uid`).
2. **Ghost / Shadow Field Injection**: User A adds `{ isAdmin: true, email: 'leak@test.com' }` to `/rankings/userA` -> Denied (`hasOnly` rejects extra keys).
3. **Unverified Email Write**: Signed-in user with `email_verified: false` attempts write to `/rankings/userA` -> Denied (`email_verified == true` required).
4. **PII Leak Read**: User A attempts `getDoc(/users/userB/private/profile)` -> Denied (`request.auth.uid != uid`).
5. **PII Blank List Scrape**: User A attempts `getDocs(/users/userB/private)` -> Denied (`allow list: if false`).
6. **Path ID Poisoning**: Request targeting `/rankings/../../etc/passwd` or 1,500-char ID -> Denied (`isValidId()` regex + length fail).
7. **Timestamp Forgery**: Client sends `createdAt: Timestamp.fromMillis(0)` or `updatedAt: futureTimestamp` -> Denied (`!= request.time`).
8. **Immutable Field Mutation**: User A updates `/rankings/userA` changing `createdAt` or `uid` -> Denied (`affectedKeys().hasOnly(...)` + immutability check).
9. **ELO / Stat Poisoning**: Client submits `onlineElo: 999999` or `legacyScore: -50` -> Denied (numeric range bounds).
10. **Unbounded Array / Type Injection on OnlineMatch**: Client submits `participantUids` with 11 items or non-string first element -> Denied (`size() <= 10 && participantUids[0] is string`).
11. **Terminal Match Tampering**: Participant attempts `updateDoc(/onlineMatches/m1, { homeScore: 99 })` -> Denied (`allow update: if false`).
12. **Unbounded Leaderboard Scrape**: Client runs `getDocs(collection(db, 'rankings'))` with no limit or `limit(500)` -> Denied (`request.query.limit <= 100`).
