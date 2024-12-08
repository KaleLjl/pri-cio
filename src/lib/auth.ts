import NextAuth from 'next-auth';
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from '@/lib/mongodb';
import google from 'next-auth/providers/google';

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async redirect({ baseUrl }) {
      // 登录成功后重定向到 /app
      return `${baseUrl}/app`;
    },
  },
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.AUTH_SECRET,
});