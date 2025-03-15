import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = email.toLowerCase();

    // Validate input
    if (!normalizedEmail) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if the user exists
    const user = await db.collection('users').findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Generate a reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the reset token in the database
    await db.collection('passwordResets').insertOne({
      email: normalizedEmail,
      token: resetToken,
      expires: resetTokenExpires,
      createdAt: new Date()
    });

    // Send password reset email
    await sendPasswordResetEmail(normalizedEmail, resetToken);

    return NextResponse.json(
      { message: 'Password reset link sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending password reset link:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}