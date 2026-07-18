import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createAdminNotification } from "../utils/AdminNotification.js";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

export const authController = {
    register: asyncHandler(async (req, res) => {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ApiError(400, "All fields are required");
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hash,
            },
        });

        await createAdminNotification({
            title: "New User",
            message: `${user.username} joined`,
            type: "USER",
        });

        res.json({
            success: true,
            user,
        });
    }),

    login: asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        const user = await prisma.user.findFirst({ where: { username } });

        if (!user) throw new ApiError(400, "User not found");

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) throw new ApiError(400, "Wrong password");

        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        // store refresh token in DB
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.cookie(
            "refreshToken",
            refreshToken,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite: "lax",
                path: "/",
                maxAge:
                    7 *
                    24 *
                    60 *
                    60 *
                    1000,
            }
        );

        res.json({
            success: true,
            token: accessToken,
        });
    }),

    refresh: asyncHandler(async (req, res) => {
        const token = req.cookies.refreshToken;

        if (!token) throw new ApiError(401, "No refresh token");

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        } catch {
            throw new ApiError(401, "Invalid refresh token");
        }

        // check DB
        const stored = await prisma.refreshToken.findUnique({
            where: { token },
        });

        if (!stored) {
            throw new ApiError(401, "Refresh token revoked");
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) throw new ApiError(401, "User not found");

        //  delete old refresh token (rotation)
        await prisma.refreshToken.delete({ where: { token } });

        //  create new refresh token
        const newRefreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.cookie(
            "refreshToken",
            newRefreshToken,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite: "lax",
                path: "/",
                maxAge:
                    7 *
                    24 *
                    60 *
                    60 *
                    1000,
            }
        );
        const newAccessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({
            success: true,
            token: newAccessToken,
        });
    }),

    logout: asyncHandler(async (req, res) => {
        const token = req.cookies.refreshToken;

        if (token) {
            await prisma.refreshToken.deleteMany({
                where: { token },
            });
        }

        res.clearCookie(
            "refreshToken",
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite: "lax",
                path: "/",
            }
        );

        res.json({ success: true });
    })
};