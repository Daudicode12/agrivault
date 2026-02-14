import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { config } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

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
  async (req: Request, res: Response, next: NextFunction) => {
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
      } as jwt.SignOptions);

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
  async (req: Request, res: Response, next: NextFunction) => {
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
      } as jwt.SignOptions);

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
router.get("/profile", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

export default router;
