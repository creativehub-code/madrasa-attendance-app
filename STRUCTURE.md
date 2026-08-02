backend/
├── .env.example
├── package.json
└── src/
    ├── app.js                         # Express + security middleware
    ├── server.js                      # Entry point
    ├── config/
    │   ├── db.js                      # MongoDB connection
    │   └── env.js                     # MONGO_URI, JWT_SECRET, PORT
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── admin.controller.js
    │   ├── teacher.controller.js
    │   └── parent.controller.js
    ├── middleware/
    │   ├── auth.js                    # JWT Bearer + RBAC
    │   ├── validate.js                # express-validator result handler
    │   ├── studentAccess.js           # Teacher/parent data isolation
    │   └── errorHandler.js            # Global error handler
    ├── models/
    │   ├── User.js
    │   ├── Student.js
    │   ├── Progress.js
    │   ├── Announcement.js
    │   ├── Feedback.js
    │   └── index.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── admin.routes.js
    │   ├── teacher.routes.js
    │   └── parent.routes.js
    ├── validators/
    │   ├── auth.validator.js
    │   ├── admin.validator.js
    │   ├── teacher.validator.js
    │   └── parent.validator.js
    └── utils/
        ├── jwt.js                     # Sign + extract Bearer token
        └── asyncHandler.js
