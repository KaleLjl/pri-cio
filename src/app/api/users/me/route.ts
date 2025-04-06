import { NextResponse } from "next/server";
import { getUserService } from "@/services/user.service"; // Import the service

export async function GET() {
  try {
    const userService = await getUserService();
    // getCurrentUser handles session checking internally
    const userProfile = await userService.getCurrentUser();

    if (!userProfile) {
      // Service returns null if unauthorized or user not found
      return NextResponse.json(
        { error: "Unauthorized or user not found" },
        { status: 401 } // Or 404 depending on desired behavior
      );
    }

    // Service returns the UserProfile object directly
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Error in GET /api/users/me:", error);
    // Use a more specific error message if possible
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch current user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
