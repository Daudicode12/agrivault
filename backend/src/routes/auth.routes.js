const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { AppDataSource } = require("../config/database");
const { User } = require("../entities/User");
const { config } = require("../config/env");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();
const userRepo = () => AppDataSource.getRepository(User);

// ── Register ──
router.post(
  "/register",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("phone").optional().trim(),
    body("location").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { fullName, email, password, phone, location } = req.body;

      // Check if user exists
      const existing = await userRepo().findOne({ where: { email } });
      if (existing) {
        throw new AppError("Email already registered", 409);
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = userRepo().create({
        fullName,
        email,
        password: hashedPassword,
        phone,
        location,
      });
      await userRepo().save(user);

      // Generate token
      const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── Login ──
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { email, password } = req.body;

      const user = await userRepo().findOne({ where: { email } });
      if (!user) {
        throw new AppError("Invalid email or password", 401);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError("Invalid email or password", 401);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── Get Profile ──
router.get("/profile", authenticate, async (req, res, next) => {
  try {
    const user = await userRepo().findOne({
      where: { id: req.userId },
      select: ["id", "fullName", "email", "phone", "location", "role", "createdAt"],
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
