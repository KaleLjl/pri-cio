import React from "react";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { Session } from "next-auth";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface HistoryProfileHeaderProps {
  avatarUrl: string | null | undefined;
  userName: string | null | undefined;
  session: Session | null;
  userId: string;
  router: AppRouterInstance;
}

const HistoryProfileHeader: React.FC<HistoryProfileHeaderProps> = ({
  avatarUrl,
  userName,
  session,
  userId,
  router,
}) => {
  const emailInitial = session?.user?.email?.charAt(0).toUpperCase() || "";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-[150px] h-[150px] rounded-full overflow-hidden">
        {avatarUrl ? (
          <ImageWithFallback
            src={avatarUrl}
            alt={userName || session?.user?.name || emailInitial}
            fill
            style={{ objectFit: "cover" }}
            isAvatar={true}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-purple-600 text-white text-6xl">
            {userName
              ? userName[0].toUpperCase()
              : session?.user?.name
              ? session.user.name[0].toUpperCase()
              : emailInitial}
          </div>
        )}
      </div>
      <h1 className="text-2xl text-white font-bold mt-4">
        {userName || session?.user?.name || emailInitial}
      </h1>
      <p className="text-sm text-gray-400 mt-2">{userId || "N/A"}</p>
      <button
        onClick={() => {
          router.push("/editprofile");
        }}
        className="mt-4 px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-300 transition duration-200"
      >
        Edit Profile
      </button>
    </div>
  );
};

export default HistoryProfileHeader;
