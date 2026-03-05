import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true, reviewsUsed: true, githubId: true },
        });
        if (dbUser) {
          session.user.plan = dbUser.plan;
          session.user.reviewsUsed = dbUser.reviewsUsed;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "github" && account.providerAccountId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { githubId: account.providerAccountId },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
};
