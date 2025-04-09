import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Import auth for session management
import { generateCompletionCode } from "@/services/deal.service"; // Import the service function

/**
 * POST handler for generating a completion code for a deal.
 * Expects { dealingId: string } in the request body.
 * Only the buyer can generate the code.
 */
export async function POST(request: Request) {
  try {
    const session = await auth(); // Get user session
    if (!session?.user?.id) {
      // Standardized check
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id; // This user must be the buyer

    const body = await request.json();
    const { dealingId } = body;

    // Basic validation
    if (!dealingId || typeof dealingId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid dealingId" },
        { status: 400 }
      );
    }

    // Call the service function to generate the code
    const code = await generateCompletionCode(dealingId, userId);

    // Return the generated code
    return NextResponse.json({ completionCode: code }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API /chat/deal/generate-code POST] Error:", error);
    // Return specific error messages from the service if available
    if (error instanceof Error) {
      // Handle specific known errors with appropriate status codes
      if (error.message === "Dealing item not found.") {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (error.message === "Invalid dealing ID format.") {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (error.message === "Deal is not in pending status.") {
        return NextResponse.json({ message: error.message }, { status: 400 }); // Bad request due to state
      }
      if (
        error.message === "Only the buyer can generate the completion code."
      ) {
        return NextResponse.json({ message: error.message }, { status: 403 }); // Forbidden
      }
      // Generic internal server error for other cases
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
    // Fallback for non-Error objects
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
