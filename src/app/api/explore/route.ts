import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ExploreService } from "@/services/explore.service";
import { z } from "zod";

const exploreService = new ExploreService();

// Schema for GET request query parameters
const GetExploreSchema = z.object({
  search: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    // Validate query parameters
    const queryParams = GetExploreSchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const items = await exploreService.getExploreItems({
      search: queryParams.search,
      userId: queryParams.userId,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching explore items:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to fetch explore items" },
      { status: 500 }
    );
  }
}

// Schema for POST request body
const PublishItemSchema = z.object({
  price: z.number(),
  description: z.string().min(1, "Description is required"),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        isPrimary: z.boolean(),
      })
    )
    .min(1, "At least one image is required"),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  historyId: z.string().min(1, "History ID is required"),
  currency: z.string().min(1, "Currency is required"),
});
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = PublishItemSchema.parse(body);

    const publishedItem = await exploreService.publishItem(
      validatedData,
      session.user.email! // Add non-null assertion
    );

    return NextResponse.json(publishedItem);
  } catch (error) {
    console.error("Error publishing item:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request body", errors: error.errors },
        { status: 400 }
      );
    }
    // Handle specific service errors (like already published)
    if (
      error instanceof Error &&
      error.message === "This item has already been published."
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message === "Invalid history ID format."
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Failed to publish item" },
      { status: 500 }
    );
  }
}

// Schema for DELETE request query parameters
const UnpublishItemSchema = z.object({
  historyId: z.string().min(1, "History ID is required"),
  exploreId: z.string().min(1, "Explore ID is required"),
});
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Check for ID instead of email
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const validatedParams = UnpublishItemSchema.parse({
      historyId: searchParams.get("historyId"),
      exploreId: searchParams.get("exploreId"),
    });

    await exploreService.unpublishItem({
      historyId: validatedParams.historyId,
      exploreId: validatedParams.exploreId,
      // userEmail: session.user.email, // Pass email if service needs it later
    });

    return NextResponse.json({ message: "Successfully unpublished" });
  } catch (error) {
    console.error("Error unpublishing item:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: error.errors },
        { status: 400 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "Invalid history or explore ID format."
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Failed to unpublish item" },
      { status: 500 }
    );
  }
}
