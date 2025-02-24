import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { email, verificationCode } = await req.json();
    const normalizedEmail = email.toLowerCase(); // Normalize email to lowercase

    // Validate input
    if (!normalizedEmail || !verificationCode) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Clean up expired pending users
    await db.collection('pendingUsers').deleteMany({
      verificationCodeExpires: { $lt: new Date() }
    });

    // Find the pending user
    const pendingUser = await db.collection('pendingUsers').findOne({
      email: normalizedEmail,
      verificationCodeExpires: { $gt: new Date() }
    });
    if (!pendingUser) {
      return NextResponse.json(
        { message: 'No pending verification found for this email' },
        { status: 400 }
      );
    }

    // Check if the code matches
    if (pendingUser.verificationCode !== verificationCode) {
      return NextResponse.json(
        { message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Check if the code has expired
    if (pendingUser.verificationCodeExpires < new Date()) {
      return NextResponse.json(
        { message: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Move the pending user to the users collection
    await db.collection('users').insertOne({
      email: normalizedEmail,
      password: pendingUser.password, // Use the hashed password from pendingUsers
      emailVerified: new Date(),
      createdAt: new Date(),
    });

    // Delete the pending user entry
    await db.collection('pendingUsers').deleteOne({ email: normalizedEmail });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}