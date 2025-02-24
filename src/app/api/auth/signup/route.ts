import { hash } from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email to lowercase to avoid case-sensitivity issues
    const normalizedEmail = email.toLowerCase();

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // Check if user already exists in 'users' collection
    const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Check if there's a pending user with verification code
    const pendingUser = await db.collection('pendingUsers').findOne({ email: normalizedEmail });
    if (pendingUser) {
      // Check if the verification code has expired
      if (pendingUser.verificationCodeExpires < new Date()) {
        // Code expired, delete pending user and allow new signup
        await db.collection('pendingUsers').deleteOne({ email: normalizedEmail });
      } else {
        return NextResponse.json(
          { message: 'Please verify your email with the code sent' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (15 minutes from now)
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Create pending user with verification code
    const result = await db.collection('pendingUsers').insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      createdAt: new Date(),
    });

    if (!result.acknowledged) {
      throw new Error('Failed to create pending user');
    }

    // Send verification email with error handling
    try {
      await sendVerificationEmail(normalizedEmail, verificationCode);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Clean up pending user if email fails
      await db.collection('pendingUsers').deleteOne({ email: normalizedEmail });
      return NextResponse.json(
        { message: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'User created successfully. Please check your email for verification.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}