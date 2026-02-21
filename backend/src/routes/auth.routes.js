const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { config } = require("../config/env");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

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
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        throw new AppError("Email already registered", 409);
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const { data: user, error } = await supabase
        .from("users")
        .insert({ fullName, email, password: hashedPassword, phone, location })
        .select("id, fullName, email, role")
        .single();
      if (error) throw new AppError(error.message, 500);

      // Generate token
      const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      res.status(201).json({
        message: "Registration successful",
        token,
        user,
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

      const { data: user, error } = await supabase
        .from("users")
        .select("id, fullName, email, password, role")
        .eq("email", email)
        .maybeSingle();
      if (error) throw new AppError(error.message, 500);
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
    const { data: user, error } = await supabase
      .from("users")
      .select("id, fullName, email, phone, location, role, createdAt")
      .eq("id", req.userId)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
