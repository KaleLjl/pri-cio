'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 font-mono">
      <pre className="text-white text-center mb-12 text-xs sm:text-sm md:text-base whitespace-pre">
        {`
__________ ________  ___  ________  ___  ________     
|\   __\  \\   __  \|\  \|\   ____\|\  \|\   __  \    
\ \  \|\  \ \  \|\  \ \  \ \  \___|\ \  \ \  \|\  \   
 \ \   ____\ \   _  _\ \  \ \  \    \ \  \ \  \\\  \  
  \ \  \___|\ \  \\  \\ \  \ \  \____\ \  \ \  \\\  \ 
   \ \__\    \ \__\\ _\\ \__\ \_______\ \__\ \_______\
    \|__|     \|__|\|__|\|__|\|_______|\|__|\|_______|
        `}
      </pre>
      
      <div className="w-64 sm:w-80 md:w-96 h-2 bg-gray-800 rounded-full overflow-hidden relative mb-6">
        <div className="w-1/3 h-full bg-green-500 rounded-full absolute left-0 top-0
                      animate-[loading_2s_ease-in-out_infinite]
                      before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full
                      before:bg-gradient-to-r before:from-transparent before:via-green-400 before:to-transparent
                      before:animate-[shimmer_1s_linear_infinite]">
        </div>
      </div>

      <p className="text-green-500 text-lg tracking-wider animate-pulse">
        Installing Pricio...
      </p>

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}