import NextAuth from 'next-auth';
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from '@/lib/mongodb';
import google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

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
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: credentials.email });

        if (!user || !user.password || typeof user.password !== 'string') {
          return null;
        }

        if (typeof credentials.password !== 'string' || typeof user.password !== 'string') {
          return null;
        }
        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error('Please verify your email before signing in.');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl
        };
      }
    })
  ],
  pages: {
    signIn: '/signin',
    signOut: '/',
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
});
