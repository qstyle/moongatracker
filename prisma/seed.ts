import 'dotenv/config';

// No seed data: users self-register via /register, which auto-creates a
// personal project. Kept as a valid `prisma db seed` target (Dockerfile CMD).
async function main() {
  console.log('seed: nothing to do');
}

main();
