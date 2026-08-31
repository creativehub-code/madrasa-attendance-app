const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['Admin', 'Teacher', 'Parent', 'school_teacher'];

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ROLES,
      required: [true, 'Role is required'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    // ─── Role-Specific Assignment Fields (backward-compatible) ──────────────
    // School Teachers: array of assigned standards (e.g. ["5th Standard", "8th Standard"])
    standards: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 15,
        message: 'Cannot assign more than 15 standards',
      },
    },
    // Madrasa Teachers: reference to assigned Class document
    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    assignedClassName: {
      type: String,
      default: '',
      trim: true,
    },
    // Soft-delete status for teachers (Active / Terminated)
    status: {
      type: String,
      enum: ['Active', 'Terminated'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1, isDeleted: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
