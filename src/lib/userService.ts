import bcrypt from 'bcrypt';
import clientPromise from '@/lib/mongodb';

export async function registerUser(email: string, password: string) {
  const client = await clientPromise;
  const db = client.db("pri-cio");
  
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection('users').insertOne({
    email,
    password: hashedPassword,
  });
}