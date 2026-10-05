const router = require('express').Router();
const prisma = require('../db');
const config = require('../config');
const { HttpError } = require('../errors');
const { issueSchema, idSchema } = require('../schemas');
const { calcFine, addDays } = require('../loans');

const include = { book: true, member: true };

// Attach live fine for unreturned loans and an overdue flag.
function present(loan, now = new Date()) {
  return {
    ...loan,
    overdue: !loan.returnedAt && loan.dueAt < now,
    fineAmount: loan.returnedAt ? loan.fineAmount : calcFine(loan.dueAt, now),
  };
}

router.get('/overdue', async (req, res) => {
  const now = new Date();
  const loans = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { lt: now } },
    include,
    orderBy: { dueAt: 'asc' },
  });
  res.json(loans.map((l) => present(l, now)));
});

// ?status=active|returned (default: all)
router.get('/', async (req, res) => {
  const { status } = req.query;
  const where =
    status === 'active'
      ? { returnedAt: null }
      : status === 'returned'
        ? { returnedAt: { not: null } }
        : undefined;
  const loans = await prisma.loan.findMany({ where, include, orderBy: { issuedAt: 'desc' } });
  res.json(loans.map((l) => present(l)));
});

router.post('/issue', async (req, res) => {
  const { bookId, memberId } = issueSchema.parse(req.body);
  const loan = await prisma.$transaction(async (tx) => {
    if (!(await tx.member.findUnique({ where: { id: memberId } }))) {
      throw new HttpError(404, 'Member not found');
    }
    // Atomic decrement: only succeeds while a copy is available.
    const { count } = await tx.book.updateMany({
      where: { id: bookId, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });
    if (!count) {
      if (!(await tx.book.findUnique({ where: { id: bookId } }))) {
        throw new HttpError(404, 'Book not found');
      }
      throw new HttpError(409, 'No copies of this book are available');
    }
    const now = new Date();
    return tx.loan.create({
      data: { bookId, memberId, issuedAt: now, dueAt: addDays(now, config.loanDays) },
      include,
    });
  });
  res.status(201).json(present(loan));
});

router.post('/:id/return', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const loan = await prisma.$transaction(async (tx) => {
    const existing = await tx.loan.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Loan not found');
    if (existing.returnedAt) throw new HttpError(409, 'Loan was already returned');
    const now = new Date();
    await tx.book.update({
      where: { id: existing.bookId },
      data: { availableCopies: { increment: 1 } },
    });
    return tx.loan.update({
      where: { id },
      data: { returnedAt: now, fineAmount: calcFine(existing.dueAt, now) },
      include,
    });
  });
  res.json(present(loan));
});

module.exports = router;
