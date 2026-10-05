process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/db');

const DAY = 24 * 60 * 60 * 1000;
const book = (o = {}) => ({ title: 'Clean Code', author: 'Robert Martin', isbn: '9780132350884', totalCopies: 2, ...o });
const member = (o = {}) => ({ name: 'Asha Patel', email: 'asha@example.com', phone: '9876543210', ...o });

beforeEach(async () => {
  await prisma.loan.deleteMany();
  await prisma.book.deleteMany();
  await prisma.member.deleteMany();
});
afterAll(() => prisma.$disconnect());

describe('health', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('books', () => {
  test('create, read, update, delete', async () => {
    const created = await request(app).post('/api/books').send(book());
    expect(created.status).toBe(201);
    expect(created.body.availableCopies).toBe(2);
    const id = created.body.id;

    expect((await request(app).get(`/api/books/${id}`)).body.title).toBe('Clean Code');

    const upd = await request(app).put(`/api/books/${id}`).send(book({ title: 'Clean Code 2', totalCopies: 5 }));
    expect(upd.status).toBe(200);
    expect(upd.body.availableCopies).toBe(5);

    expect((await request(app).delete(`/api/books/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/books/${id}`)).status).toBe(404);
  });

  test('validation rejects bad input with 400', async () => {
    for (const bad of [
      book({ title: '' }),
      book({ author: '   ' }),
      book({ isbn: '123' }),
      book({ totalCopies: 0 }),
      book({ totalCopies: 'abc' }),
      {},
    ]) {
      const res = await request(app).post('/api/books').send(bad);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  test('malformed JSON gives 400, not 500', async () => {
    const res = await request(app).post('/api/books').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  test('duplicate ISBN gives 409', async () => {
    await request(app).post('/api/books').send(book());
    const res = await request(app).post('/api/books').send(book({ isbn: '978-0-13-235088-4' }));
    expect(res.status).toBe(409);
  });

  test('non-numeric id gives 400, unknown id gives 404', async () => {
    expect((await request(app).get('/api/books/abc')).status).toBe(400);
    expect((await request(app).get('/api/books/9999')).status).toBe(404);
    expect((await request(app).delete('/api/books/9999')).status).toBe(404);
  });

  test('search by title, author and ISBN', async () => {
    await request(app).post('/api/books').send(book());
    await request(app).post('/api/books').send(book({ title: 'The Hobbit', author: 'Tolkien', isbn: '9780547928227' }));
    const count = async (q) => (await request(app).get('/api/books').query({ q })).body.length;
    expect(await count('clean')).toBe(1);
    expect(await count('tolkien')).toBe(1);
    expect(await count('9780547928227')).toBe(1);
    expect(await count('978-0-547')).toBe(1);
    expect(await count('nothing')).toBe(0);
    expect(await count('')).toBe(2);
  });
});

describe('members', () => {
  test('register, update, delete and validate', async () => {
    const created = await request(app).post('/api/members').send(member());
    expect(created.status).toBe(201);
    expect(created.body.joinedAt).toBeTruthy();

    expect((await request(app).post('/api/members').send(member())).status).toBe(409);
    expect((await request(app).post('/api/members').send(member({ email: 'nope' }))).status).toBe(400);
    expect((await request(app).post('/api/members').send(member({ phone: 'abc' }))).status).toBe(400);
    expect((await request(app).post('/api/members').send(member({ name: '' }))).status).toBe(400);

    const upd = await request(app).put(`/api/members/${created.body.id}`).send(member({ name: 'Asha P' }));
    expect(upd.body.name).toBe('Asha P');
    expect((await request(app).delete(`/api/members/${created.body.id}`)).status).toBe(204);
  });
});

describe('loans', () => {
  async function setup(copies = 1) {
    const b = (await request(app).post('/api/books').send(book({ totalCopies: copies }))).body;
    const m = (await request(app).post('/api/members').send(member())).body;
    return { b, m };
  }

  test('issue sets 14-day due date and decrements copies', async () => {
    const { b, m } = await setup();
    const res = await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id });
    expect(res.status).toBe(201);
    const days = Math.round((new Date(res.body.dueAt) - new Date(res.body.issuedAt)) / DAY);
    expect(days).toBe(14);
    expect((await request(app).get(`/api/books/${b.id}`)).body.availableCopies).toBe(0);
  });

  test('cannot issue when no copies are available', async () => {
    const { b, m } = await setup(1);
    await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id });
    const res = await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id });
    expect(res.status).toBe(409);
  });

  test('issue validates input and references', async () => {
    const { b, m } = await setup();
    expect((await request(app).post('/api/loans/issue').send({})).status).toBe(400);
    expect((await request(app).post('/api/loans/issue').send({ bookId: 9999, memberId: m.id })).status).toBe(404);
    expect((await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: 9999 })).status).toBe(404);
  });

  test('on-time return has no fine and restores the copy', async () => {
    const { b, m } = await setup();
    const loan = (await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id })).body;
    const res = await request(app).post(`/api/loans/${loan.id}/return`);
    expect(res.status).toBe(200);
    expect(res.body.fineAmount).toBe(0);
    expect(res.body.returnedAt).toBeTruthy();
    expect((await request(app).get(`/api/books/${b.id}`)).body.availableCopies).toBe(1);
    expect((await request(app).post(`/api/loans/${loan.id}/return`)).status).toBe(409);
    expect((await request(app).post('/api/loans/9999/return')).status).toBe(404);
  });

  test('overdue loan: listed, counted, and fined on return (1/day)', async () => {
    const { b, m } = await setup();
    const loan = (await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id })).body;
    // Backdate: due 5 days (and a bit) ago
    await prisma.loan.update({
      where: { id: loan.id },
      data: { issuedAt: new Date(Date.now() - 19.5 * DAY), dueAt: new Date(Date.now() - 4.5 * DAY) },
    });

    const overdue = (await request(app).get('/api/loans/overdue')).body;
    expect(overdue).toHaveLength(1);
    expect(overdue[0].fineAmount).toBe(5);
    expect(overdue[0].book.title).toBe('Clean Code');

    const dash = (await request(app).get('/api/dashboard')).body;
    expect(dash).toMatchObject({ totalBooks: 1, issuedBooks: 1, overdueCount: 1 });

    const ret = await request(app).post(`/api/loans/${loan.id}/return`);
    expect(ret.body.fineAmount).toBe(5);
    expect((await request(app).get('/api/loans/overdue')).body).toHaveLength(0);
    expect((await request(app).get('/api/dashboard')).body.issuedBooks).toBe(0);
  });

  test('cannot delete book or member with an active loan; copies cannot drop below issued', async () => {
    const { b, m } = await setup(2);
    await request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id });
    expect((await request(app).delete(`/api/books/${b.id}`)).status).toBe(409);
    expect((await request(app).delete(`/api/members/${m.id}`)).status).toBe(409);
    const low = await request(app).put(`/api/books/${b.id}`).send(book({ totalCopies: 1 }));
    expect(low.status).toBe(200); // 1 issued, 1 total is fine
    expect((await request(app).put(`/api/books/${b.id}`).send(book({ totalCopies: 1 }))).body.availableCopies).toBe(0);
  });

  test('concurrent issues never oversell a single copy', async () => {
    const { b, m } = await setup(1);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/api/loans/issue').send({ bookId: b.id, memberId: m.id }))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await request(app).get(`/api/books/${b.id}`)).body.availableCopies).toBe(0);
  });
});

describe('dashboard and misc', () => {
  test('empty dashboard', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.body).toMatchObject({ totalBooks: 0, issuedBooks: 0, overdueCount: 0 });
  });
  test('unknown api route gives JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
