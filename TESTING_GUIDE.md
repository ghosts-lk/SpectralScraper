# 🧪 Spectral Scraper - Comprehensive Testing Guide

## Quick Start
```bash
cd /home/kami/Git Projects/SpectralScraper
npm run web:dev
# Visit http://localhost:3000
```

---

## ✅ Features to Test

### 1. **Dashboard Navigation**
- [ ] Home tab loads statistics correctly
- [ ] Leads tab displays recent leads
- [ ] Operations tab shows activity log
- [ ] Tab switching is smooth and responsive

### 2. **Data Source Selection**
- [ ] All 6 sources display correctly:
  - 💼 LinkedIn
  - 🔍 Crunchbase
  - 🌐 Company Sites
  - ✉️ Email DB
  - 🐙 GitHub
  - 𝕏 Twitter
- [ ] Sources can be selected/deselected
- [ ] Button highlights when active
- [ ] Multiple sources can be selected

### 3. **Launch Scraper**
- [ ] Button only enabled when source selected
- [ ] Prevents starting while operation in progress
- [ ] Shows progress bar during operation
- [ ] Toast notification on start
- [ ] Operation logged with timestamp
- [ ] Progress bar animates to 100%
- [ ] Success message on completion

### 4. **CSV Import**
- [ ] File picker opens on label click
- [ ] Shows filename after selection
- [ ] Upload progress bar visible
- [ ] Import disabled during operation
- [ ] Success notification on completion
- [ ] Stats update after import
- [ ] File input resets after import

### 5. **Score All Leads**
- [ ] Only enabled when leads exist
- [ ] Disables during processing
- [ ] Shows progress animation
- [ ] Prevents duplicate operations
- [ ] Status updates in operations log
- [ ] Success notification after completion

### 6. **Error Handling**
- [ ] Network error detection
- [ ] Empty source selection error
- [ ] Missing file error
- [ ] HTTP error handling (4xx, 5xx)
- [ ] Timeout handling
- [ ] Toast shows error messages
- [ ] Operations log shows failures

### 7. **Real-time Updates**
- [ ] Statistics refresh every 5 seconds
- [ ] Leads list refreshes every 3 seconds
- [ ] Operations log updates in real-time
- [ ] No duplicate operations
- [ ] Timestamps are accurate

### 8. **Toast Notifications**
- [ ] Success toast (green border, light background)
- [ ] Error toast (red border, light red background)
- [ ] Auto-dismiss after 3 seconds
- [ ] Can have multiple toasts
- [ ] Positioned correctly (top-right)

### 9. **Progress Bars**
- [ ] Show percentage (0-100%)
- [ ] Animate smoothly
- [ ] Display percentage text
- [ ] Have gradient background
- [ ] Different colors for status (yellow for running, green for success, red for error)

### 10. **Operation Log**
- [ ] Shows all operations in reverse chronological order
- [ ] Displays timestamp for each operation
- [ ] Shows status badge (RUNNING, SUCCESS, ERROR)
- [ ] Displays progress bar for running operations
- [ ] No more than 20 operations listed
- [ ] Supports different status colors

---

## 🧬 API Tests

### Get Statistics
```bash
curl http://localhost:3000/api/bulk/stats/global
```
Expected response:
```json
{
  "totalOperations": number,
  "activeOperations": number,
  "totalLeadsProcessed": number,
  "successRate": "percentage%",
  "averageProcessingTime": number
}
```

### Get Leads
```bash
curl http://localhost:3000/api/leads?limit=10
```
Expected response:
```json
{
  "leads": [{...}, {...}],
  "total": number,
  "limit": 10,
  "offset": 0,
  "pages": number
}
```

### Import CSV
```bash
curl -X POST \
  -F "file=@test.csv" \
  http://localhost:3000/api/import/csv
```

### Score Bulk
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}' \
  http://localhost:3000/api/score/bulk
```

---

## 🔍 Advanced Error Testing

### Test Network Error
1. Start scraper with source selected
2. Stop server while operation in progress
3. Should show error toast: "Network error or server unreachable"
4. Operation log should mark as error

### Test Empty Source Selection
1. Click "Launch Scraper" without selecting sources
2. Should show error toast: "Please select at least one data source"
3. No operation should be logged

### Test Duplicate Operations
1. Click "Launch Scraper" twice rapidly
2. Second click should be ignored
3. Only one operation should be logged
4. Toast should prevent duplicate: "Operation already in progress"

### Test Large File Upload
1. Select very large CSV (>50MB)
2. Monitor progress bar
3. Should show upload progress
4. Should handle gracefully

### Test Invalid CSV
1. Upload non-CSV file
2. Server should reject with error
3. Error should appear in operation log
4. Toast should show error message

---

## 📊 Performance Tests

### Load Test
1. Generate 10,000 test leads
2. Import CSV with all leads
3. Score all leads
4. Verify:
   - Progress bar remains responsive
   - No UI freezing
   - Performance acceptable

### Memory Test
1. Keep dashboard open for 1 hour
2. Repeatedly perform operations
3. Check browser memory usage
4. Should not have memory leaks

### Concurrent Operations
1. Multiple browser tabs open same dashboard
2. Start operations in each tab
3. Verify operations tracked independently
4. Statistics update correctly for all tabs

---

## 📋 Checklist

### Pre-Release Testing
- [ ] All 10 feature tests pass
- [ ] All API tests return correct responses
- [ ] All error handling tests pass
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Toast notifications work
- [ ] Progress bars display correctly
- [ ] Operations log accurate

### Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Devices
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 🐛 Bug Report Template

If you find an issue, report it with:

**Title**: Brief description
**Environment**: Browser, OS, Device
**Steps to Reproduce**:
1. ...
2. ...
3. ...
**Expected Result**: What should happen
**Actual Result**: What actually happened
**Screenshots**: If applicable
**Console Errors**: Any JavaScript errors

---

## ✨ Status

- **Version**: 1.0
- **Last Updated**: March 29, 2026
- **Status**: Ready for Testing
- **All Features**: Complete
- **Error Handling**: Comprehensive
- **Performance**: Optimized
