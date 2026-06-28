import { NextResponse } from "next/server";
import { getClientPortalBySlug } from "@/lib/clientPortals/getClientPortal";
import { resolveLoginStoreIds } from "@/lib/clientPortals/resolveClientUser";
import { validateClientLogin } from "@/lib/clientPortals/validateClientLogin";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const portal = await getClientPortalBySlug(slug);

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim();
    const password = body.password?.trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const result = await validateClientLogin(slug, username, password, portal);

    if (!result.user) {
      console.error("[client login] validation failed:", result.error);

      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const user = result.user;
    const storeIds = await resolveLoginStoreIds(user);

    return NextResponse.json({
      session: {
        userId: user.id,
        slug: slug.trim().toLowerCase(),
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        accessLevel: user.accessLevel,
        storeIds,
      },
    });
  } catch (error) {
    console.error("[client login] error:", error);

    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
