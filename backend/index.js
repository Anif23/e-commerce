import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import http from "http";
import { Server } from "socket.io";

import { todoRoutes } from "./routes/todo.js";
import { authRoutes } from "./routes/auth.js";

import {
  productRoutes,
  cartRoutes,
  categoryRoutes,
  checkOutRoutes,
  orderRoutes,
  mergeApiRoutes,
  wishlistRoutes,
  profileRoutes,
  notificationRoutes
} from "./routes/ecommerce/user.js";

import { adminRoutes } from "./routes/ecommerce/admin.js";

import { errorHandler } from "./utils/ErrorHandler.js";

dotenv.config();

const app = express();

const server =
  http.createServer(app);

export const io =
  new Server(server, {
    cors: {
      origin:
        process.env.FRONTEND_URL,
      credentials: true,
    },
  });

global.onlineUsers =
  new Map();

io.on(
  "connection",
  (socket) => {

    console.log(
      "Socket Connected:",
      socket.id
    );

    socket.on(
      "join",
      (userId) => {

        global.onlineUsers.set(
          userId,
          socket.id
        );

        console.log(
          "User Joined:",
          userId
        );
      }
    );

    socket.on(
      "disconnect",
      () => {

        for (const [
          key,
          value,
        ] of global.onlineUsers.entries()) {

          if (
            value ===
            socket.id
          ) {
            global.onlineUsers.delete(
              key
            );
          }
        }

        console.log(
          "Socket Disconnected"
        );
      }
    );
  }
);

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

app.use(
  "/uploads",
  express.static(
    "uploads"
  )
);

authRoutes(app);

adminRoutes(app);

productRoutes(app);

categoryRoutes(app);

cartRoutes(app);

checkOutRoutes(app);

orderRoutes(app);

mergeApiRoutes(app);

wishlistRoutes(app);

profileRoutes(app);

notificationRoutes(app);

todoRoutes(app);

app.use(errorHandler);

server.listen(
  process.env.PORT,
  () => {

    console.log(
      `Server running on ${process.env.PORT}`
    );
  }
);