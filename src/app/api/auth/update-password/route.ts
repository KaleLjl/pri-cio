import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    // Validate input
    if (!token || !newPassword) {
      return NextResponse.json(
        { message: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Password length validation
    if (newPassword.length < 8 || newPassword.length > 50) {
      return NextResponse.json(
        { message: 'Password must be between 8 and 50 characters' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find the reset token in the database
    const resetRequest = await db.collection('passwordResets').findOne({
      token: token,
      expires: { $gt: new Date() }
    });

    if (!resetRequest) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update the user's password
    const updateResult = await db.collection('users').updateOne(
      { email: resetRequest.email },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Delete the used reset token
    await db.collection('passwordResets').deleteOne({ token: token });

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}