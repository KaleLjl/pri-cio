import NextAuth, { DefaultSession } from "next-auth"; // Import DefaultSession
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { ObjectId } from "mongodb"; // Import ObjectId
// Removed unused JWT import

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await clientPromise;
        const db = client.db();
        // Ensure we fetch the user document with ObjectId
        const user = await db.collection("users").findOne<{
          _id: ObjectId; // Expect ObjectId
          email: string;
          password?: string;
          name?: string;
          avatarUrl?: string;
          emailVerified?: Date | null;
        }>({ email: credentials.email });

        if (!user || !user.password || typeof user.password !== "string") {
          return null;
        }

        // Type check credentials.password
        if (typeof credentials.password !== "string") {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in.");
        }

        // Return the user object expected by NextAuth callbacks
        return {
          id: user._id.toString(), // Pass ID as string
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    signOut: "/",
  },
  callbacks: {
    // Add jwt callback
    async jwt({ token, user }) {
      // On successful sign-in (user object is present), add user ID to the token.
      // The user object comes from the authorize function or the provider profile.
      if (user?.id) {
        token.sub = user.id; // Use 'sub' for standard JWT subject claim (maps to id)
      }
      return token;
    },
    // Add session callback
    async session({ session, token }) {
      // Add the user ID (from token.sub) to the session object.
      // This makes it available via useSession() client-side and auth() server-side.
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      // Keep existing redirect logic
      return `${baseUrl}/explore`;
    },
  },
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});

// Add type augmentation for Session and JWT
// This tells TypeScript about the custom 'id' field on session.user
declare module "next-auth" {
  interface Session {
    user?: {
      id?: string | null; // Add id field
    } & DefaultSession["user"];
  }
  // Removed conflicting User interface augmentation
}

// No changes needed for JWT declaration if using token.sub
// declare module "next-auth/jwt" {
//   interface JWT {
//     // If using token.sub, it's already typed.
//     // If using a custom claim like token.id:
//     // id?: string;
//   }
// }
