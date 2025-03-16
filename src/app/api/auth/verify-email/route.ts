import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sendVerificationEmail } from '@/lib/email';
import { hash } from 'bcryptjs'; // Import for password hashing

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json(); // Expect both email and password
    const normalizedEmail = email.toLowerCase(); // Normalize email to lowercase

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if the user already exists in the users collection
    const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists',
          code: 'EMAIL_EXISTS'
        },
        { status: 400 }
      );
    }

    // Check if there's already a pending user
    const pendingUser = await db.collection('pendingUsers').findOne({ email: normalizedEmail });
    if (pendingUser) {
      if (pendingUser.verificationCodeExpires > new Date()) {
        return NextResponse.json(
          { message: 'A verification code has already been sent. Please use or request a new one if expired.' },
          { status: 400 }
        );
      } else {
        // Delete expired pending user to allow a new request
        await db.collection('pendingUsers').deleteOne({ email: normalizedEmail });
      }
    }

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // Create or update pending user with email, password, verification code, and expiration
    await db.collection('pendingUsers').insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      createdAt: new Date(),
    });

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationCode);

    return NextResponse.json(
      { message: 'Verification code sent successfully. Please check your email.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}