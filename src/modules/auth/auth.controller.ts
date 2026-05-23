import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { SignupBody, LoginBody, User } from '../../utils/types';

const SALT_ROUNDS = 10;

// POST /api/auth/signup
// export const signup = async (
//   req: Request<object, object, SignupBody>,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { name, email, password, role } = req.body;

//     // Validate required fields
//     if (!name || !email || !password) {
//       sendError(res, StatusCodes.BAD_REQUEST, 'name, email, and password are required.');
//       return;
//     }

//     // Validate role value
//     const userRole = role || 'contributor';
//     if (!['contributor', 'maintainer'].includes(userRole)) {
//       sendError(res, StatusCodes.BAD_REQUEST, 'role must be contributor or maintainer.');
//       return;
//     }

//     // Check if email is already taken
//     const existingUser = await pool.query(
//       'SELECT id FROM users WHERE email = $1',
//       [email]
//     );
//     if ((existingUser.rowCount ?? 0) > 0) {
//       sendError(res, StatusCodes.BAD_REQUEST, 'Email is already registered.');
//       return;
//     }

//     // Hash password before saving
//     const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

//     // Insert new user
//     const result = await pool.query(
//       `INSERT INTO users (name, email, password, role)
//        VALUES ($1, $2, $3, $4)
//        RETURNING id, name, email, role, created_at, updated_at`,
//       [name, email, hashedPassword, userRole]
//     );

//     sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
//   } catch (error) {
//     next(error);
//   }
// };

// POST /api/auth/login
export const login = async (
  req: Request<object, object, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'email and password are required.');
      return;
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if ((result.rowCount ?? 0) === 0) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    const user: User = result.rows[0];

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    // Sign JWT — include id, name, role in payload
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    sendSuccess(res, StatusCodes.OK, 'Login successful', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};
