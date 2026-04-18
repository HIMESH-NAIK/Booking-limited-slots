# Smart Resource Booking System - Enhancement Quick Reference

## 🔧 Code Architecture

### New Objects in `js/app.js`

#### ProfileSystem
```javascript
ProfileSystem.getProfile(email)        // Get user profile
ProfileSystem.updateProfile(email, {}) // Update profile info
```

#### MessageSystem
```javascript
MessageSystem.sendTeacherMessage(email, text, recipientType)
MessageSystem.getUserMessages(email, role)
MessageSystem.markAsRead(messageId)
MessageSystem.getUnreadCount(email, role)
```

#### ResourceLimitSystem
```javascript
ResourceLimitSystem.getResourceLimits()
ResourceLimitSystem.updateResourceLimit(resourceId, limit, role)
ResourceLimitSystem.getLimit(resourceId)
```

#### ChatBotSystem
```javascript
ChatBotSystem.getResponse(userMessage) // Get bot response
ChatBotSystem.responses[]               // Array of response patterns
```

#### BookingSystem.getVisibleBookings()
```javascript
BookingSystem.getVisibleBookings(role, userEmail) // NEW: Role-based filtering
```

---

## 📦 localStorage Structure

```javascript
// Profile data (key: 'userProfiles')
{
  'email@example.com': {
    email: 'email@example.com',
    name: 'User Name',
    role: 'student|teacher|admin',
    createdAt: '2024-01-01T...',
    updatedAt: '2024-01-01T...'
  }
}

// Messages (key: 'messages')
[
  {
    id: 'msg-1234567890',
    from: 'teacher@example.com',
    fromRole: 'teacher',
    text: 'Message content',
    recipientType: 'all' | 'student@example.com',
    createdAt: '2024-01-01T...',
    read: false|true
  }
]

// Resource limits (key: 'resourceLimits')
{
  'medical-room': 8,
  'meeting-room': 6,
  'lab': 4,
  'auditorium': 10
}
```

---

## 🎨 CSS Classes for Styling

### Chat Bot
- `.chat-toggle` - Toggle button (blue circle, bottom-right)
- `.chat-bot-widget` - Chat window container
- `.chat-header` - Blue gradient header
- `.chat-messages` - Message container
- `.chat-message` - Individual message
- `.user-message` - User's message (blue, right-aligned)
- `.bot-message` - Bot's message (gray, left-aligned)
- `.chat-input-area` - Input section
- `.chat-input` - Text input field

### Notifications
- `.notification-center` - Bell icon container
- `.notif-bell` - Bell icon button
- `.notif-badge` - Unread count badge (red circle)
- `.notif-dropdown` - Dropdown menu for notifications
- `.notif-item` - Individual notification
- `.notif-item.unread` - Styling for unread messages
- `.notif-item.read` - Styling for read messages

### Profile
- `.card-profile` - Profile card with gradient
- `.profile-display` - Profile information display
- `.profile-form` - Profile edit form

---

## 🔄 How Features Interact

### Message Flow (Teacher → Student):
1. Teacher enters message in textarea
2. Clicks "Send Message" button
3. `setupTeacherMessages()` captures input
4. `MessageSystem.sendTeacherMessage()` stores in localStorage
5. Success alert shown
6. Student's `setupNotifications()` detects new message
7. Notification badge updates
8. Message appears in dropdown

### Profile Update Flow:
1. User clicks "Edit" button
2. `setupProfileSection()` shows edit form
3. User modifies name field
4. Clicks "Save"
5. `ProfileSystem.updateProfile()` validates and saves
6. localStorage updates
7. Dashboard display refreshes immediately
8. Success alert confirmed

---

## 🐛 Debugging Tips

### Check localStorage:
```javascript
// In browser console
localStorage.getItem('messages')
localStorage.getItem('userProfiles')
localStorage.getItem('resourceLimits')
```

### Verify role-based filtering:
```javascript
// Check if message visibility is correct
BookingSystem.getVisibleBookings('student', 'student@example.com')
MessageSystem.getUserMessages('student@example.com', 'student')
```

### Test chat bot responses:
```javascript
// In browser console
ChatBotSystem.getResponse('how do I book?')
ChatBotSystem.getResponse('cancel booking')
```

---

## 🚀 Extending Features

### Add More Chat Responses:
```javascript
// In ChatBotSystem.responses array
{
    keywords: ['your', 'keyword', 'list'],
    response: 'Your bot response here'
}
```

### Add New Profile Fields:
```javascript
// In setupProfileSection()
// Add new input field to profileForm
// Update ProfileSystem.updateProfile() to handle it
```

### Customize Message Types:
```javascript
// Create new message type in MessageSystem
MessageSystem.sendNotification(userEmail, type, content)
```

### Modify Notification Styling:
```javascript
// Edit CSS in css/style.css under "ENHANCEMENTS: NOTIFICATIONS"
.notif-item {
    /* Your custom styles */
}
```

---

## ⚠️ Important Notes

### DO NOT:
- ❌ Modify `Auth` object (authentication is locked)
- ❌ Modify `Nav` object (navigation system is locked)
- ❌ Change existing `BookingSystem` functions (backward compatibility)
- ❌ Remove existing HTML elements (breaks styling)
- ❌ Mix messaging and notification systems

### DO:
- ✅ Add new features as new objects (like ProfileSystem)
- ✅ Extend existing objects carefully
- ✅ Test changes in browser console first
- ✅ Check localStorage for data persistence
- ✅ Verify role-based access

---

## 📱 Responsive Design

All new features are responsive:
- Chat widget: Fixed position (scales on mobile)
- Notifications: Dropdown adapts to screen size
- Profile: Form responsive on all devices
- Messages: Text area expands on large screens

---

## 🔐 Security Checklist

When modifying code, ensure:
- ✅ No hardcoded passwords or secrets
- ✅ Role checks before sensitive operations
- ✅ No direct localStorage modification without validation
- ✅ Email-based user identification maintained
- ✅ No XSS vulnerabilities (use textContent for user data)

---

## 📊 Performance Considerations

- Chat bot: Lightweight keyword matching (no regex)
- Notifications: Auto-update every 5 seconds (configurable)
- Messages: Filter on retrieval (not stored separately per role)
- Profile: Single localStorage access per update
- Limits: Cache limits per session for performance

---

## 🎯 Common Tasks

### Hide a feature from a role:
```javascript
// In dashboard initialization
if (role === 'student') {
    const resourceLimitUI = document.getElementById('resourceLimitUI');
    if (resourceLimitUI) resourceLimitUI.style.display = 'none';
}
```

### Change notification update frequency:
```javascript
// In setupNotifications()
setInterval(updateNotifications, 5000); // Change 5000 to desired milliseconds
```

### Add permission check:
```javascript
if (['admin', 'teacher'].includes(role)) {
    // Allow operation
} else {
    UI.showAlert('Insufficient permissions', 'error');
}
```

---

## 📞 Support

For issues or questions about the enhancements:
1. Check ENHANCEMENTS.md for feature documentation
2. Review js/app.js comment blocks for code explanations
3. Test in browser console with specific objects
4. Check localStorage for data issues
5. Verify role before debugging access issues

---

## 🎓 Learning Path

To understand the enhancements:
1. Read ENHANCEMENTS.md for overview
2. Review js/app.js sections (ProfileSystem, MessageSystem, etc.)
3. Check HTML files for new elements
4. Review CSS classes in style.css
5. Test features in browser console
6. Modify non-critical features first

---

**Last Updated**: April 18, 2026
**System Version**: 2.0 (Enhanced)
**Status**: Production Ready ✨
