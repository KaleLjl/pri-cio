import { NextResponse } from "next/server";
import { getUserService } from "@/services/user.service"; // Import the service
// ObjectId is no longer needed here as validation happens in the service

export async function GET(
  request: Request,
  { params }: { params: { userId: string } } // Params are directly available
) {
  try {
    const { userId } = params; // Get userId directly

    const userService = await getUserService();
    // getUserById handles ID validation and fetching internally
    const userProfile = await userService.getUserById(userId);

    if (!userProfile) {
      // Service returns null if ID is invalid or user not found
      return NextResponse.json(
        { error: "Invalid user ID or user not found" },
        { status: 404 } // Combine 400 and 404 for simplicity here
      );
    }

    // Service returns the partial UserProfile object
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error(`Error in GET /api/users/${params.userId}:`, error);
    // Use a more specific error message if possible
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
