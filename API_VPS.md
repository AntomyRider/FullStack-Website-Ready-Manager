# API Documentation for VPS

Base URL:

```text
http://157.254.192.134/api
```

Content type:

```http
Content-Type: application/json
```

Admin authentication uses an HTTP-only cookie named `token`. After login, the browser stores the cookie automatically. Frontend requests must include credentials/cookies.

For Axios:

```js
axios.get("/api/auth/me", { withCredentials: true })
```

For curl:

```bash
curl -i -c cookies.txt -b cookies.txt http://157.254.192.134/api/auth/me
```

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

Success response:

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "pepoth00@gmail.com"
  }
}
```

Notes:

- Sets `token` cookie.
- Cookie is `httpOnly`, so JavaScript cannot read it directly.
- Use `/auth/me` to check whether the token is valid.

### Check Current Session

```http
GET /auth/me
```

Success response:

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

Unauthenticated response:

```json
{
  "success": false,
  "message": "Unauthenticated"
}
```

Notes:

- This endpoint returns HTTP `200` even when no session exists.
- If the token is invalid or expired, the server clears the cookie and returns `success: false`.

## Admin Licence APIs

These endpoints require the admin `token` cookie from login.

### Create Licence Keys

```http
POST /licences/create
```

Request:

```json
{
  "amount": 5,
  "exp": 30,
  "maxUsersPerKey": 1
}
```

Fields:

- `amount`: number of keys to create. Default: `1`
- `exp`: expiry in days. `0` means no expiry. Default: `0`
- `maxUsersPerKey`: number of HWIDs/users allowed per key. Default: `1`

Success response:

```json
{
  "success": true,
  "amount": 5,
  "exp": 30,
  "expireAt": "2026-06-16T00:00:00.000Z",
  "maxUsersPerKey": 1,
  "keys": [
    "ABCDE-12345-FGHIJ-67890"
  ]
}
```

### List Licence Keys

```http
GET /licences/list
```

Success response:

```json
[
  {
    "id": 1,
    "key": "ABCDE-12345-FGHIJ-67890",
    "status": "Enable",
    "expireAt": "2026-06-16T00:00:00.000Z",
    "activatedAt": null,
    "maxUsersPerKey": 1,
    "usedCount": 0,
    "createdAt": "2026-05-17T00:00:00.000Z",
    "updatedAt": "2026-05-17T00:00:00.000Z",
    "hwids": [],
    "usedSlots": 0,
    "availableSlots": 1
  }
]
```

### Delete Licence Key

```http
DELETE /licences/delete/:id
```

Example:

```http
DELETE /licences/delete/1
```

Success response:

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

### Update Licence Status

```http
POST /licences/update/:id
```

Request:

```json
{
  "status": "Disable"
}
```

Allowed status:

- `Enable`
- `Disable`

Success response:

```json
{
  "success": true,
  "message": "Key updated",
  "data": {
    "id": 1,
    "status": "Disable"
  }
}
```

### Reset HWID

```http
POST /licences/resetkey
```

Reset all HWIDs for a key:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890"
}
```

Reset only one HWID:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890",
  "hwid": "USER-HWID-001"
}
```

Success response:

```json
{
  "success": true,
  "message": "HWID reset successfully"
}
```

### Dashboard Stats

```http
GET /licences/stats
```

Success response:

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

## Public Licence APIs

These endpoints are public and do not require admin login.

### Activate Licence

```http
POST /licences/activate
```

Request:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890",
  "hwid": "USER-HWID-001"
}
```

Success response:

```json
{
  "success": true,
  "message": "Activated"
}
```

Error examples:

```json
{
  "success": false,
  "message": "Key is full (max 1 user)"
}
```

```json
{
  "success": false,
  "message": "Licence expired"
}
```

### Verify Licence

```http
POST /licences/verify
```

Request:

```json
{
  "key": "ABCDE-12345-FGHIJ-67890",
  "hwid": "USER-HWID-001"
}
```

Success response:

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

## Example curl Flow

Login and save cookie:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"pepoth00@gmail.com","password":"bonus2548"}' \
  http://157.254.192.134/api/auth/login
```

Check session:

```bash
curl -b cookies.txt http://157.254.192.134/api/auth/me
```

Create key:

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"amount":1,"exp":30,"maxUsersPerKey":1}' \
  http://157.254.192.134/api/licences/create
```

Activate key from client app:

```bash
curl -H "Content-Type: application/json" \
  -d '{"key":"ABCDE-12345-FGHIJ-67890","hwid":"USER-HWID-001"}' \
  http://157.254.192.134/api/licences/activate
```

Verify key from client app:

```bash
curl -H "Content-Type: application/json" \
  -d '{"key":"ABCDE-12345-FGHIJ-67890","hwid":"USER-HWID-001"}' \
  http://157.254.192.134/api/licences/verify
```

## Status Codes

- `200`: Success, or session check completed with `success: false`
- `400`: Missing or invalid request body
- `401`: Admin endpoint has no valid token cookie
- `403`: Licence inactive, expired, full, or not allowed
- `404`: Licence/user not found
- `500`: Server or database error

## Important VPS Notes

- Frontend should call relative paths such as `/api/auth/login`, not `http://localhost:3000`.
- On VPS, `localhost` inside the browser means the user's computer, not the VPS.
- Docker Compose creates MariaDB user `nutx` with password `bonus2548`.
- Admin seed currently creates:

```text
Email: pepoth00@gmail.com
Password: bonus2548
```

- The admin auth cookie is `httpOnly`; this is correct. Check login state by calling `/auth/me`.
- If you later add HTTPS, set the production cookie to secure mode and update `CLIENT_ORIGIN`.

## Known Issues to Review

- `GET /licences/stats` still selects `hwid` in `latestKeys`, but the current Prisma schema uses the `LicenceHwid` relation instead of a direct `hwid` field. If this endpoint returns `500`, update the stats query to use `hwids`.
- `POST /licences/verify` also still checks `licence.hwid`, while the newer schema stores HWIDs in `LicenceHwid`. If verify is required for production, update it to check the `hwids` relation.
