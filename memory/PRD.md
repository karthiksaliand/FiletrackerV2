# DK File Tracker - Government File Tracking System

## Overview
A secure, role-based Government File Tracking application for Dakshina Kannada District with parallel departmental approvals, deadline monitoring, automatic reminders, escalation mechanisms, and full audit trail.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with expo-router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

## User Roles (15 Users)
| Role | Username | Default Password |
|------|----------|-----------------|
| Admin | admin | admin123 |
| Case Worker | caseworker | case123 |
| Tahsildar Mangaluru | tah_mangaluru | tah123 |
| Tahsildar Bantwal | tah_bantwal | tah123 |
| Tahsildar Mulki | tah_mulki | tah123 |
| Tahsildar Moodabidri | tah_moodabidri | tah123 |
| Tahsildar Puttur | tah_puttur | tah123 |
| Tahsildar Sulya | tah_sulya | tah123 |
| Tahsildar Kadaba | tah_kadaba | tah123 |
| Tahsildar Ullala | tah_ullala | tah123 |
| Tahsildar Belthangady | tah_belthangady | tah123 |
| Forest Officer | forest | forest123 |
| SP | sp | sp123 |
| ADC | adc | adc123 |
| DC | dc | dc123 |

## Core Features
1. **Role-based Login**: 4 categories (Case Worker, Tahsildar w/ 9 locations, Dept Officers, Senior Officers & Admin)
2. **File Creation**: Unique file numbers (DK/FILE/YEAR/XXXX), applicant details, tahsildar assignment
3. **Parallel Approvals**: Simultaneous review by Tahsildar, SP, and Forest departments
4. **30-Day Deadline**: Countdown timer, auto-escalation when crossed
5. **2-Day Reminders**: Automatic notifications every 2 days for pending approvals
6. **ADC Review**: View all files, add remarks (cannot edit file data)
7. **DC Final Decision**: Accept or reject files
8. **Admin Panel**: User management, password reset, analytics, audit logs
9. **Audit Trail**: Full action logging with timestamps
10. **File Locking**: Files locked after submission, only admin can override

## Admin Full Control
- **Edit All Properties**: Admin can modify every field - applicant name, phone, address, description, tahsildar location, status, lock state, DC decision/remark, ADC remark
- **Delete Files**: Permanently removes file + all approvals + notifications
- **Override Approvals**: Admin can override any department's approval decision
- **Status Control**: Change file status (draft, submitted, delayed, approved, rejected)
- **Lock/Unlock**: Toggle file lock state at any stage

## API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/files` - Create file
- `GET /api/files` - List files (role-filtered)
- `GET /api/files/{id}` - File detail
- `PUT /api/files/{id}` - Edit file
- `POST /api/files/{id}/submit` - Submit file
- `POST /api/files/{id}/approval` - Department approval
- `POST /api/files/{id}/adc-remark` - ADC remark
- `POST /api/files/{id}/dc-decision` - DC decision
- `GET /api/notifications` - Notifications
- `GET /api/admin/users` - User management
- `POST /api/admin/users/{id}/reset-password` - Reset password
- `GET /api/admin/analytics` - Dashboard stats
- `PUT /api/admin/files/{id}` - Admin full edit (all properties)
- `DELETE /api/admin/files/{id}` - Admin delete file
- `PUT /api/admin/files/{id}/approval/{aid}` - Admin override approval

## Screens
1. Login (Role Selection)
2. Dashboard (Role-specific stats)
3. Files List (Search, filter, FAB create)
4. File Detail (Approvals, actions, audit trail)
5. Create File (Form with tahsildar picker)
6. Notifications
7. Admin Panel (Users, Analytics, Audit Logs)
