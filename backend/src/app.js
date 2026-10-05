const express = require('express');
const cors = require('cors');
const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const prisma = require('./db');
const logger = require('./logger');
const { HttpError } = require('./errors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(logger.requestLogger);

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error('health check failed', { error: err.message });
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/books', require('./routes/books'));
app.use('/api/members', require('./routes/members'));
app.use('/api/loans', require('./routes/loans'));

app.get('/api/dashboard', async (req, res) => {
  const now = new Date();
  const [books, copies, issuedBooks, overdueCount, members] = await Promise.all([
    prisma.book.count(),
    prisma.book.aggregate({ _sum: { totalCopies: true, availableCopies: true } }),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
    prisma.member.count(),
  ]);
  res.json({
    totalBooks: books,
    totalCopies: copies._sum.totalCopies || 0,
    availableCopies: copies._sum.availableCopies || 0,
    issuedBooks,
    overdueCount,
    totalMembers: members,
  });
});

app.use('/api', (req, res, next) => next(new HttpError(404, 'Route not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: errors[0].message, errors });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String(err.meta?.target || '');
    const field = target.includes('isbn') ? 'ISBN' : target.includes('email') ? 'Email' : 'Value';
    return res.status(409).json({ error: `${field} already exists` });
  }
  logger.error('unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
