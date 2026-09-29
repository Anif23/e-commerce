import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  priority: z.coerce.number().int().min(1).max(5).default(1),
  completed: z.boolean().default(false),
});

const owned = async (id, userId) => {
  const todo = await prisma.todo.findFirst({ where: { id: Number(id), userId } });
  if (!todo) throw ApiError.notFound('Todo not found');
  return todo;
};

export const todosController = {
  list: asyncHandler(async (req, res) => {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completed: 'asc' }, { priority: 'desc' }, { id: 'desc' }],
    });

    res.json({ success: true, data: todos });
  }),

  create: asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);

    const todo = await prisma.todo.create({ data: { ...data, userId: req.user.id } });

    res.status(201).json({ success: true, data: todo });
  }),

  update: asyncHandler(async (req, res) => {
    const todo = await owned(req.params.id, req.user.id);
    const data = schema.partial().parse(req.body);

    const updated = await prisma.todo.update({ where: { id: todo.id }, data });

    res.json({ success: true, data: updated });
  }),

  remove: asyncHandler(async (req, res) => {
    const todo = await owned(req.params.id, req.user.id);

    await prisma.todo.delete({ where: { id: todo.id } });

    res.json({ success: true, message: 'Todo deleted' });
  }),
};
