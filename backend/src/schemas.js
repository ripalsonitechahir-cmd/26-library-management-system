const { z } = require('zod');

const text = (name, max = 200) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .min(1, `${name} is required`)
    .max(max, `${name} is too long`);

const isbn = z
  .string({ error: 'ISBN is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\d{9}[\dXx]|\d{13})$/.test(v), 'ISBN must be a valid ISBN-10 or ISBN-13')
  .transform((v) => v.toUpperCase());

const int = (name, min) =>
  z.coerce
    .number({ error: `${name} must be a number` })
    .int(`${name} must be a whole number`)
    .min(min, `${name} must be at least ${min}`);

const bookSchema = z.object({
  title: text('Title'),
  author: text('Author'),
  isbn,
  totalCopies: int('Copies', 1).max(10000, 'Copies is too large'),
});

const memberSchema = z.object({
  name: text('Name'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Email is invalid')
    .max(200),
  phone: z
    .string({ error: 'Phone is required' })
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,17}$/, 'Phone must be 7-18 digits'),
});

const issueSchema = z.object({
  bookId: int('bookId', 1),
  memberId: int('memberId', 1),
});

const idSchema = int('id', 1);

module.exports = { bookSchema, memberSchema, issueSchema, idSchema };
