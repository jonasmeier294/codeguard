import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const repo = await prisma.repository.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!repo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.repository.update({
    where: { id },
    data: { isActive: !repo.isActive },
  });

  return NextResponse.json(updated);
}
