// Seeds demo data only when the database is empty.
const prisma = require('../src/db');

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  if ((await prisma.book.count()) > 0 || (await prisma.member.count()) > 0) {
    console.log('Seed skipped: database already has data');
    return;
  }

  const books = await Promise.all(
    [
      ['Clean Code', 'Robert C. Martin', '9780132350884', 3],
      ['The Pragmatic Programmer', 'Andrew Hunt', '9780201616224', 2],
      ['Design Patterns', 'Erich Gamma', '9780201633610', 2],
      ['Refactoring', 'Martin Fowler', '9780134757599', 1],
      ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 4],
      ['The Hobbit', 'J.R.R. Tolkien', '9780547928227', 5],
    ].map(([title, author, isbn, n]) =>
      prisma.book.create({ data: { title, author, isbn, totalCopies: n, availableCopies: n } })
    )
  );

  const members = await Promise.all(
    [
      ['Asha Patel', 'asha.patel@example.com', '9876543210'],
      ['Ravi Kumar', 'ravi.kumar@example.com', '9123456780'],
      ['Meera Shah', 'meera.shah@example.com', '9988776655'],
    ].map(([name, email, phone]) => prisma.member.create({ data: { name, email, phone } }))
  );

  const now = Date.now();
  // [book, member, days ago issued]: 20 days ago => overdue (due 14 days after issue)
  for (const [b, m, ago] of [
    [0, 0, 20],
    [3, 1, 5],
    [1, 2, 16],
  ]) {
    const issuedAt = new Date(now - ago * DAY);
    await prisma.loan.create({
      data: {
        bookId: books[b].id,
        memberId: members[m].id,
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + 14 * DAY),
      },
    });
    await prisma.book.update({
      where: { id: books[b].id },
      data: { availableCopies: { decrement: 1 } },
    });
  }
  console.log('Seeded demo data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
