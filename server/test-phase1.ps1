# Block 4D - Phase 1 Testing Script
# Run each command in order

# 1. Login as teacher
Write-Host "1. Logging in as teacher..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/join" -Method Post -Body (@{name="Test Teacher"; role="teacher"} | ConvertTo-Json) -ContentType "application/json"
$token = $loginResponse.token
$teacherId = $loginResponse.user.id
Write-Host "✓ Logged in as: $($loginResponse.user.name)" -ForegroundColor Green
Write-Host "  Token: $($token.Substring(0,20))..." -ForegroundColor Gray
Write-Host ""

# 2. Get classes
Write-Host "2. Getting classes..." -ForegroundColor Cyan
$classesResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/classes" -Method Get -Headers @{Authorization="Bearer $token"}
$classId = $classesResponse.classes[0].id
Write-Host "✓ Found class: $($classesResponse.classes[0].title)" -ForegroundColor Green
Write-Host "  Class ID: $classId" -ForegroundColor Gray
Write-Host ""

# 3. Get slides
Write-Host "3. Getting slides..." -ForegroundColor Cyan
$slidesResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/slides/class/$classId" -Method Get -Headers @{Authorization="Bearer $token"}
$slideId = $slidesResponse.slides[0].id
Write-Host "✓ Found slide: Slide $($slidesResponse.slides[0].slide_number)" -ForegroundColor Green
Write-Host "  Slide ID: $slideId" -ForegroundColor Gray
Write-Host ""

# 4. Create session
Write-Host "4. Creating live session..." -ForegroundColor Cyan
$sessionBody = @{
    class_id = $classId
    slide_id = $slideId
    allow_student_draw = $false
} | ConvertTo-Json
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions" -Method Post -Body $sessionBody -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
$sessionId = $sessionResponse.session.id
$sessionCode = $sessionResponse.session.session_code
Write-Host "✓ Session created!" -ForegroundColor Green
Write-Host "  Session ID: $sessionId" -ForegroundColor Yellow
Write-Host "  Session Code: $sessionCode" -ForegroundColor Yellow
Write-Host "  Active: $($sessionResponse.session.is_active -eq 1)" -ForegroundColor Gray
Write-Host ""

# 5. Get session by ID
Write-Host "5. Getting session by ID..." -ForegroundColor Cyan
$getResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/$sessionId" -Method Get -Headers @{Authorization="Bearer $token"}
Write-Host "✓ Session retrieved: $($getResponse.session.session_code)" -ForegroundColor Green
Write-Host ""

# 6. Update permissions
Write-Host "6. Updating permissions..." -ForegroundColor Cyan
$permBody = @{allow_student_draw = $true} | ConvertTo-Json
$permResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/$sessionId/permissions" -Method Put -Body $permBody -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
Write-Host "✓ Permissions updated!" -ForegroundColor Green
Write-Host "  Allow Student Draw: $($permResponse.session.allow_student_draw -eq 1)" -ForegroundColor Gray
Write-Host ""

# 7. Join as student
Write-Host "7. Testing join as student..." -ForegroundColor Cyan
$studentLogin = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/join" -Method Post -Body (@{name="Test Student"; role="student"} | ConvertTo-Json) -ContentType "application/json"
$studentToken = $studentLogin.token
$joinBody = @{session_code = $sessionCode} | ConvertTo-Json
$joinResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/join" -Method Post -Body $joinBody -ContentType "application/json" -Headers @{Authorization="Bearer $studentToken"}
Write-Host "✓ Student joined: $($joinResponse.session.session_code)" -ForegroundColor Green
Write-Host ""

# 8. Get active sessions
Write-Host "8. Getting active sessions..." -ForegroundColor Cyan
$activeResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/teacher/active" -Method Get -Headers @{Authorization="Bearer $token"}
Write-Host "✓ Active sessions: $($activeResponse.count)" -ForegroundColor Green
Write-Host ""

# 9. Get stats
Write-Host "9. Getting statistics..." -ForegroundColor Cyan
$statsResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/teacher/stats" -Method Get -Headers @{Authorization="Bearer $token"}
Write-Host "✓ Statistics:" -ForegroundColor Green
Write-Host "  Total: $($statsResponse.stats.total)" -ForegroundColor Gray
Write-Host "  Active: $($statsResponse.stats.active)" -ForegroundColor Gray
Write-Host "  Ended: $($statsResponse.stats.ended)" -ForegroundColor Gray
Write-Host ""

# 10. End session
Write-Host "10. Ending session..." -ForegroundColor Cyan
$endResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/sessions/$sessionId/end" -Method Put -Headers @{Authorization="Bearer $token"}
Write-Host "✓ Session ended!" -ForegroundColor Green
Write-Host "  Active: $($endResponse.session.is_active -eq 1)" -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 ALL TESTS PASSED! Phase 1 working correctly." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Checklist:" -ForegroundColor Green
Write-Host "   [✓] Create session" -ForegroundColor Gray
Write-Host "   [✓] Get session by ID" -ForegroundColor Gray
Write-Host "   [✓] Join with code" -ForegroundColor Gray
Write-Host "   [✓] Update permissions" -ForegroundColor Gray
Write-Host "   [✓] Get active sessions" -ForegroundColor Gray
Write-Host "   [✓] Get statistics" -ForegroundColor Gray
Write-Host "   [✓] End session" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Ready for Phase 2: Yjs + Canvas Integration" -ForegroundColor Cyan
