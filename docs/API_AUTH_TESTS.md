# 🧪 API AUTHENTICATION ENDPOINTS - MANUAL TEST SUITE

**Base URL:** `http://localhost:3002`  
**Date:** 2025-12-19  
**Phase:** 4 - API Routes Testing

---

## 📋 TEST PLAN

### ✅ Endpoints to Test:

1. POST /api/auth/register/teacher
2. POST /api/auth/register/student
3. POST /api/auth/login
4. POST /api/auth/change-password
5. GET /api/auth/me
6. POST /api/auth/join (legacy)

---

## 🧪 TEST 1: Register Teacher (Happy Path)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/register/teacher \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test Teacher\", \"username\": \"test.teacher\", \"password\": \"password123\"}"
```

### Expected Response (201 Created):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Test Teacher",
    "username": "test.teacher",
    "role": "teacher",
    "avatar_color": "#...",
    "created_at": "2025-12-19..."
  }
}
```

### Validation Checklist:

- [ ] Status code is 201
- [ ] Returns valid JWT token
- [ ] User object contains username
- [ ] Role is "teacher"
- [ ] Avatar color is generated
- [ ] Created_at timestamp is present

---

## 🧪 TEST 2: Register Student (Happy Path)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test Student\", \"username\": \"test.student\", \"password\": \"password123\"}"
```

### Expected Response (201 Created):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Test Student",
    "username": "test.student",
    "role": "student",
    "avatar_color": "#...",
    "created_at": "2025-12-19..."
  }
}
```

### Validation Checklist:

- [ ] Status code is 201
- [ ] Returns valid JWT token
- [ ] Role is "student"
- [ ] Username is lowercase

---

## 🧪 TEST 3: Register - Duplicate Username (Error Case)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Another Student\", \"username\": \"test.student\", \"password\": \"password123\"}"
```

### Expected Response (409 Conflict):

```json
{
  "success": false,
  "error": {
    "message": "Username is already taken",
    "code": "CONFLICT_ERROR"
  }
}
```

### Validation Checklist:

- [ ] Status code is 409
- [ ] Error message is clear
- [ ] No user created in database

---

## 🧪 TEST 4: Register - Invalid Username (Validation Error)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Bad User\", \"username\": \"ab\", \"password\": \"password123\"}"
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "errors": [
    {
      "field": "username",
      "message": "Username must be between 3 and 20 characters"
    }
  ]
}
```

### Validation Checklist:

- [ ] Status code is 400
- [ ] Validation error message is descriptive
- [ ] Field name is included in error

---

## 🧪 TEST 5: Register - Weak Password (Validation Error)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Weak Pass User\", \"username\": \"weak.user\", \"password\": \"123\"}"
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    }
  ]
}
```

### Validation Checklist:

- [ ] Status code is 400
- [ ] Password requirement is clear

---

## 🧪 TEST 6: Login (Happy Path)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"prof.garcia\", \"password\": \"password123\"}"
```

### Expected Response (200 OK):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "teacher-001",
    "name": "Prof. García",
    "username": "prof.garcia",
    "role": "teacher",
    "avatar_color": "#3b82f6",
    "created_at": "...",
    "last_login": "2025-12-19..."
  }
}
```

### Validation Checklist:

- [ ] Status code is 200
- [ ] Returns valid JWT token
- [ ] last_login is updated (recent timestamp)
- [ ] All user fields present
- [ ] password_hash is NOT included in response

---

## 🧪 TEST 7: Login - Wrong Password (Error Case)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"prof.garcia\", \"password\": \"wrongpassword\"}"
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "message": "Invalid username or password",
    "code": "VALIDATION_ERROR"
  }
}
```

### Validation Checklist:

- [ ] Status code is 400
- [ ] Generic error message (no username enumeration)
- [ ] No token returned

---

## 🧪 TEST 8: Login - Non-Existent User (Error Case)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"nonexistent.user\", \"password\": \"password123\"}"
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "message": "Invalid username or password",
    "code": "VALIDATION_ERROR"
  }
}
```

### Validation Checklist:

- [ ] Status code is 400
- [ ] Same error message as wrong password (security)

---

## 🧪 TEST 9: Login - Case Insensitive Username

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"PROF.GARCIA\", \"password\": \"password123\"}"
```

### Expected Response (200 OK):

```json
{
  "success": true,
  "token": "...",
  "user": {
    "username": "prof.garcia",
    ...
  }
}
```

### Validation Checklist:

- [ ] Login succeeds with uppercase username
- [ ] Returned username is lowercase
- [ ] Case-insensitive matching works

---

## 🧪 TEST 10: Get Current User Info (Happy Path)

### Request:

```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "prof.garcia", "password": "password123"}' \
  | jq -r '.token')

# Then get user info
curl -X GET http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Expected Response (200 OK):

```json
{
  "success": true,
  "user": {
    "id": "teacher-001",
    "name": "Prof. García",
    "username": "prof.garcia",
    "role": "teacher",
    "avatar_color": "#3b82f6",
    "active": true,
    "created_at": "...",
    "last_login": "..."
  }
}
```

### Validation Checklist:

- [ ] Status code is 200
- [ ] All user fields present (including username, active, last_login)
- [ ] password_hash is NOT in response
- [ ] active is boolean (not 0/1)

---

## 🧪 TEST 11: Get Current User - No Token (Error Case)

### Request:

```bash
curl -X GET http://localhost:3002/api/auth/me
```

### Expected Response (401 Unauthorized):

```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

### Validation Checklist:

- [ ] Status code is 401
- [ ] Clear error message

---

## 🧪 TEST 12: Change Password (Happy Path)

### Request:

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "prof.garcia", "password": "password123"}' \
  | jq -r '.token')

# Change password
curl -X POST http://localhost:3002/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword": "password123", "newPassword": "newpassword456"}'
```

### Expected Response (200 OK):

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Validation Checklist:

- [ ] Status code is 200
- [ ] Success message returned
- [ ] Can login with new password
- [ ] Cannot login with old password

---

## 🧪 TEST 13: Change Password - Wrong Old Password

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword": "wrongpassword", "newPassword": "newpassword456"}'
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "message": "Current password is incorrect",
    "code": "VALIDATION_ERROR"
  }
}
```

### Validation Checklist:

- [ ] Status code is 400
- [ ] Password not changed in database

---

## 🧪 TEST 14: Change Password - Same as Old

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword": "password123", "newPassword": "password123"}'
```

### Expected Response (400 Bad Request):

```json
{
  "success": false,
  "errors": [
    {
      "field": "newPassword",
      "message": "New password must be different from current password"
    }
  ]
}
```

### Validation Checklist:

- [ ] Validation prevents same password

---

## 🧪 TEST 15: Legacy Join Endpoint (Backward Compatibility)

### Request:

```bash
curl -X POST http://localhost:3002/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Legacy User", "role": "student"}'
```

### Expected Response (200 OK):

```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "name": "Legacy User",
    "role": "student",
    "avatar_color": "#...",
    "created_at": "..."
  }
}
```

### Validation Checklist:

- [ ] Legacy endpoint still works
- [ ] Creates user without username/password
- [ ] Returns token successfully

---

## 📊 TEST SUMMARY

### Overall Coverage:

- [ ] All endpoints tested (6 endpoints)
- [ ] Happy paths validated (6 tests)
- [ ] Error cases validated (8 tests)
- [ ] Edge cases validated (2 tests)
- [ ] Security validated (username enumeration, case sensitivity)

### Security Checks:

- [ ] Passwords are hashed (never returned)
- [ ] Username enumeration prevented
- [ ] Case-insensitive login works
- [ ] Validation errors are descriptive
- [ ] Auth middleware works correctly

### Data Integrity:

- [ ] Users created with all required fields
- [ ] last_login updates on login
- [ ] Passwords can be changed
- [ ] Duplicate usernames rejected

---

## ✅ FINAL VALIDATION

After all tests pass:

1. [ ] All 15 tests completed
2. [ ] No errors in server logs
3. [ ] Database integrity maintained
4. [ ] TypeScript compilation successful
5. [ ] Ready for frontend integration

---

**Test Date:** ******\_******  
**Tested By:** ******\_******  
**Result:** ⬜ PASS ⬜ FAIL  
**Notes:** ************\_************
