import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Import auth for session management
import { verifyAndCompleteDeal } from "@/services/deal.service"; // Import the new service function

/**
 * POST handler for verifying a completion code and completing a deal.
 * Expects { dealingId: string, code: string } in the request body.
 */
export async function POST(request: Request) {
  try {
    const session = await auth(); // Get user session
    if (!session?.user?.id) {
      // Standardized check
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { dealingId, code } = body;

    // Basic validation
    if (!dealingId || typeof dealingId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid dealingId" },
        { status: 400 }
      );
    }
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid code" },
        { status: 400 }
      );
    }

    // Call the service function to verify the code and complete the deal
    await verifyAndCompleteDeal(dealingId, code, userId);

    // If verifyAndCompleteDeal doesn't throw, it means success
    return NextResponse.json(
      { message: "Deal completed successfully via code verification." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API /chat/deal/verify-code POST] Error:", error);
    // Return specific error messages from the service if available
    if (error instanceof Error) {
      // Handle specific known errors with appropriate status codes
      if (
        error.message === "Dealing item not found." ||
        error.message.includes("Associated history item")
      ) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (
        error.message === "Invalid dealing ID format." ||
        error.message === "Invalid code provided."
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (
        error.message === "Deal is not in pending status." ||
        error.message ===
          "Completion code has not been generated for this deal." ||
        error.message === "Invalid completion code."
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 }); // Bad request due to state/input
      }
      if (error.message === "Only the seller can verify the completion code.") {
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
