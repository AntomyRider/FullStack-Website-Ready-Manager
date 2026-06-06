# API Documentation for VPS

Base URL:

```text
http://157.254.192.134/api
```

All requests use JSON:

```http
Content-Type: application/json
```

Admin authentication uses an HTTP-only cookie named `token`. JavaScript cannot read this cookie directly. Use `/auth/me` to check the current session.

## Auth

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "pepoth00@gmail.com",
  "password": "bonus2548"
}
```

Success:

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "pepoth00@gmail.com"
  }
}
```

### Check Session

```http
GET /auth/me
```

Success:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "pepoth00@gmail.com",
    "createdAt": "2026-05-17T00:00:00.000Z"
  }
}
```

No session:

```json
{
  "success": false,
  "message": "Unauthenticated"
}
```

## Admin License APIs

These endpoints require the admin `token` cookie.

### Create Keys

```http
POST /licenses/create
```

Request:

```json
{
  "amount": 5,
  "exp": 30
}
```

Fields:

- `amount`: number of keys to create. Default: `1`
- `exp`: expiry in days. `0` means no expiry. Default: `0`

Success:

```json
{
  "success": true,
  "amount": 5,
  "exp": 30,
  "expireAt": "2026-06-16T00:00:00.000Z",
  "keys": [
    "ABCDE-12345-FGHIJ-67890"
  ]
}
```

### List Keys

```http
GET /licenses/list
```

Success:

```json
[
  {
    "id": 1,
    "key": "ABCDE-12345-FGHIJ-67890",
    "hwid": null,
    "status": "Enable",
    "expireAt": "2026-06-16T00:00:00.000Z",
    "activatedAt": null,
    "createdAt": "2026-05-17T00:00:00.000Z",
    "updatedAt": "2026-05-17T00:00:00.000Z"
  }
]
```

### Delete Key

```http
DELETE /licenses/delete/:id
```

Success:

```json
{
  "success": true,
  "message": "Key deleted",
  "data": {
    "id": 1,
    "key": "ABCDE-12345-FGHIJ-67890"
  }
}
```

### Update Status

```http
POST /licenses/update/:id
```

Request:

```json
{
  "status": "Disable"
}
```

Allowed values:

- `Enable`
- `Disable`

Success:

```json
{
  "success": true,
  "message": "Key updated"
}
```

### Reset HWID

```http
POST /licenses/resetkey
```

Request:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890"
}
```

Success:

```json
{
  "success": true,
  "message": "HWID reset successfully"
}
```

### Dashboard Stats

```http
GET /licenses/stats
```

Success:

```json
{
  "success": true,
  "data": {
    "totalKeys": 10,
    "enableKeys": 8,
    "disableKeys": 2,
    "activatedKeys": 5,
    "expiredKeys": 1,
    "unusedKeys": 5,
    "recentKeys": [],
    "latestKeys": []
  }
}
```

## Public License APIs

These endpoints are public and are used by the desktop/client app.

Rule:

```text
1 key = 1 HWID
```

### Activate Key

```http
POST /licenses/activate
```

Request:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890",
  "hwid": "USER-HWID-001"
}
```

Behavior:

- If the key has no HWID, the server binds this HWID to the key.
- If the key already has the same HWID, activation succeeds again.
- If the key already has a different HWID, activation fails with `HWID mismatch`.

Success:

```json
{
  "success": true,
  "message": "Activated"
}
```

### Verify Key

```http
POST /licenses/verify
```

Request:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890",
  "hwid": "USER-HWID-001"
}
```

Success:

```json
{
  "success": true,
  "message": "Verified",
  "data": {
    "key": "ABCDE-12345-FGHIJ-67890",
    "hwid": "USER-HWID-001",
    "status": "Enable"
  }
}
```

Error examples:

```json
{
  "success": false,
  "message": "HWID mismatch"
}
```

```json
{
  "success": false,
  "message": "License expired"
}
```

## curl Examples

Login:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"pepoth00@gmail.com","password":"bonus2548"}' \
  http://157.254.192.134/api/auth/login
```

Create one key:

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"amount":1,"exp":30}' \
  http://157.254.192.134/api/licenses/create
```

Activate:

```bash
curl -H "Content-Type: application/json" \
  -d '{"key":"ABCDE-12345-FGHIJ-67890","hwid":"USER-HWID-001"}' \
  http://157.254.192.134/api/licenses/activate
```

Verify:

```bash
curl -H "Content-Type: application/json" \
  -d '{"key":"ABCDE-12345-FGHIJ-67890","hwid":"USER-HWID-001"}' \
  http://157.254.192.134/api/licenses/verify
```

## VPS Notes

- Frontend should call `/api/...`, not `http://localhost:3000`.
- Docker Compose creates MariaDB user `nutx` with password `bonus2548`.
- Admin seed creates `pepoth00@gmail.com` with password `bonus2548`.
- On HTTP, cookie `secure` should stay false. If you add HTTPS later, set secure cookie mode.
