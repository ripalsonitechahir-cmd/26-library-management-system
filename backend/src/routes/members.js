const router = require('express').Router();
const prisma = require('../db');
const { HttpError } = require('../errors');
const { memberSchema, idSchema } = require('../schemas');

const notFound = () => new HttpError(404, 'Member not found');

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const members = await prisma.member.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json(members);
});

router.get('/:id', async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: idSchema.parse(req.params.id) } });
  if (!member) throw notFound();
  res.json(member);
});

router.post('/', async (req, res) => {
  const member = await prisma.member.create({ data: memberSchema.parse(req.body) });
  res.status(201).json(member);
});

router.put('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = memberSchema.parse(req.body);
  if (!(await prisma.member.findUnique({ where: { id } }))) throw notFound();
  res.json(await prisma.member.update({ where: { id }, data }));
});

router.delete('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await prisma.$transaction(async (tx) => {
    if (!(await tx.member.findUnique({ where: { id } }))) throw notFound();
    const active = await tx.loan.count({ where: { memberId: id, returnedAt: null } });
    if (active) throw new HttpError(409, 'Cannot delete a member who has active loans');
    await tx.loan.deleteMany({ where: { memberId: id } });
    await tx.member.delete({ where: { id } });
  });
  res.status(204).end();
});

module.exports = router;
