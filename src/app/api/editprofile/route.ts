import { NextResponse } from "next/server";
// Removed unused imports: clientPromise, uploadToS3, deleteFromS3, ObjectId
// import clientPromise from "@/lib/mongodb"; // No longer needed
// import { ObjectId } from "mongodb"; // No longer needed
import { auth } from "@/lib/auth";
import { getUserService } from "@/services/user.service";
import { UserProfile } from "@/lib/types/user"; // Moved import to top

// GET: Fetch the current user's profile
export async function GET() {
  // Removed unused req parameter
  try {
    const userService = await getUserService();
    const userProfile = await userService.getCurrentUser(); // Handles session check

    if (!userProfile) {
      return NextResponse.json(
        { error: "Unauthorized or user not found" },
        { status: 401 }
      );
    }
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} // Added missing closing brace for GET function

// POST: Update current user's profile (including avatar via FormData)
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const about = formData.get("about") as string | null;
    const website = formData.get("website") as string | null;
    const avatarFile = formData.get("avatar") as File | null;
    // Check if avatar is explicitly being removed
    const removeAvatar = formData.get("removeAvatar") === "true";

    const updateData: Partial<UserProfile> = {};
    if (name !== null) updateData.name = name;
    // Allow empty strings to clear fields
    if (about !== null) updateData.about = about;
    if (website !== null) updateData.website = website;
    if (removeAvatar) updateData.avatarUrl = null; // Signal removal

    // Basic validation
    if (
      !updateData.name &&
      !avatarFile &&
      !removeAvatar &&
      about === null &&
      website === null
    ) {
      return NextResponse.json(
        { message: "No update data provided" },
        { status: 400 }
      );
    }
    if (updateData.name === "") {
      return NextResponse.json(
        { message: "Name cannot be empty" },
        { status: 400 }
      );
    }

    const userService = await getUserService();
    const updatedUserProfile = await userService.updateUserProfile(
      userId,
      updateData,
      avatarFile ?? undefined // Pass undefined if null
    );

    if (!updatedUserProfile) {
      return NextResponse.json(
        { message: "Failed to update profile (User not found or error)" },
        { status: 404 } // Or 500 depending on service error handling
      );
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: updatedUserProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT: Update current user's profile (JSON body, no file upload)
export async function PUT(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = (await req.json()) as Partial<UserProfile>;

    // Remove fields that shouldn't be updated this way (e.g., id, email, avatar)
    delete updates._id;
    delete updates.email; // Prevent changing email via this route
    delete updates.avatarUrl; // Avatar handled by POST
    delete updates.createdAt;
    delete updates.updatedAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No update data provided" },
        { status: 400 }
      );
    }
    if (updates.name === "") {
      return NextResponse.json(
        { message: "Name cannot be empty" },
        { status: 400 }
      );
    }

    const userService = await getUserService();
    // Call updateUserProfile without the file argument
    const updatedUserProfile = await userService.updateUserProfile(
      userId,
      updates
    );

    if (!updatedUserProfile) {
      return NextResponse.json(
        { message: "Failed to update profile (User not found or error)" },
        { status: 404 } // Or 500
      );
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: updatedUserProfile,
    });
  } catch (error) {
    console.error("Error updating profile (PUT):", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE: Delete the current user's profile
export async function DELETE() {
  // Removed unused req parameter
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userService = await getUserService();
    const success = await userService.deleteUserProfile(userId);

    if (!success) {
      return NextResponse.json(
        { message: "Failed to delete profile (User not found or error)" },
        { status: 404 } // Or 500
      );
    }

    return NextResponse.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
