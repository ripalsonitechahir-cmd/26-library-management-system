const router = require('express').Router();
const prisma = require('../db');
const { HttpError } = require('../errors');
const { bookSchema, idSchema } = require('../schemas');

const notFound = () => new HttpError(404, 'Book not found');

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const books = await prisma.book.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { author: { contains: q } },
            { isbn: { contains: q.replace(/[\s-]/g, '') } },
          ],
        }
      : undefined,
    orderBy: { title: 'asc' },
  });
  res.json(books);
});

router.get('/:id', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: idSchema.parse(req.params.id) } });
  if (!book) throw notFound();
  res.json(book);
});

router.post('/', async (req, res) => {
  const { totalCopies, ...data } = bookSchema.parse(req.body);
  const book = await prisma.book.create({
    data: { ...data, totalCopies, availableCopies: totalCopies },
  });
  res.status(201).json(book);
});

router.put('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { totalCopies, ...data } = bookSchema.parse(req.body);
  const book = await prisma.$transaction(async (tx) => {
    const existing = await tx.book.findUnique({ where: { id } });
    if (!existing) throw notFound();
    const issued = existing.totalCopies - existing.availableCopies;
    if (totalCopies < issued) {
      throw new HttpError(409, `Copies cannot be less than the ${issued} currently issued`);
    }
    return tx.book.update({
      where: { id },
      data: { ...data, totalCopies, availableCopies: totalCopies - issued },
    });
  });
  res.json(book);
});

router.delete('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await prisma.$transaction(async (tx) => {
    if (!(await tx.book.findUnique({ where: { id } }))) throw notFound();
    const active = await tx.loan.count({ where: { bookId: id, returnedAt: null } });
    if (active) throw new HttpError(409, 'Cannot delete a book that has active loans');
    await tx.loan.deleteMany({ where: { bookId: id } });
    await tx.book.delete({ where: { id } });
  });
  res.status(204).end();
});

module.exports = router;
