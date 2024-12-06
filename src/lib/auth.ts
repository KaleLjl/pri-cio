import NextAuth from 'next-auth';
import google from 'next-auth/providers/google';

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
});