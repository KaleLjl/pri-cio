'use client';

import React, { useState } from 'react';
import { useCreatePost } from '@/lib/hooks/useCreatePost';

const CreatePostPage = () => {
  const {
    selectedImage,
    isLoading,
    result,
    errorMessage,
    conversation,
    uploadImage,
    analyzeImage,
    sendMessage,
    clearImage,
  } = useCreatePost();

  const [messageInput, setMessageInput] = useState('');

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    await sendMessage(messageInput);
    setMessageInput('');
  };

  const handleClear = () => {
    clearImage();
    setMessageInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Test Google API</h1>

      {/* 1) File Input */}
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadImage(e.target.files[0]);
            }
          }}
          className="block w-full text-sm text-gray-400
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-purple-500 file:text-white
                     hover:file:bg-purple-700"
        />
      </div>

      {/* 2) Analyze & Clear Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={analyzeImage}
          disabled={isLoading || !selectedImage}
          className={`py-2 px-4 rounded-md font-semibold ${
            isLoading || !selectedImage
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-700'
          }`}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Image'}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className={`py-2 px-4 rounded-md font-semibold ${
            isLoading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-700'
          }`}
        >
          Clear
        </button>
      </div>

      {/* 3) Display raw result */}
      {result && (
        <div className="mb-4 p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-bold mb-2">Analysis Result</h3>
          <pre className="text-sm font-mono text-gray-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* 4) Error Message */}
      {errorMessage && (
        <div className="p-4 mb-4 bg-red-700 rounded-md">
          <p className="text-sm text-white">{errorMessage}</p>
        </div>
      )}

      {/* 5) Conversation Display */}
      <div className="bg-gray-800 p-4 rounded-md mb-4">
        <h2 className="font-bold text-lg mb-2">Conversation</h2>
        {conversation.length === 0 ? (
          <p className="text-gray-400 italic">Start by uploading an image and analyzing it.</p>
        ) : (
          <ul>
            {conversation.map((msg, idx) => (
              <li key={idx} className="mb-2">
                <strong>{msg.role === 'user' ? 'You:' : 'GPT:'}</strong> {msg.content}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 6) Send Message Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-grow p-2 text-black rounded-md"
          placeholder="Ask or respond..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !messageInput.trim()}
          className={`px-4 py-2 rounded-md font-semibold ${
            isLoading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-700'
          }`}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default CreatePostPage;







// 'use client';

// import React, { useState } from 'react';
// import { useCreatePost } from '@/lib/hooks/useCreatePost';

// const CreatePostPage = () => {
//   const {
//     selectedImage,
//     isLoading,
//     result,
//     errorMessage,
//     conversation,
//     uploadImage,
//     analyzeImage,
//     sendMessage,
//     clearImage,
//   } = useCreatePost();

//   // local input state for user messages
//   const [messageInput, setMessageInput] = useState('');

//   const handleSendMessage = async () => {
//     if (!messageInput.trim()) return;
//     await sendMessage(messageInput);
//     setMessageInput('');
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-8">
//       <h1 className="text-2xl font-bold mb-6">Test Google API</h1>

//       {/* 1) File Input */}
//       <div className="mb-4">
//         <input
//           type="file"
//           accept="image/*"
//           onChange={(e) => {
//             if (e.target.files && e.target.files.length > 0) {
//               uploadImage(e.target.files[0]);
//             }
//           }}
//           className="block w-full text-sm text-gray-400
//                      file:mr-4 file:py-2 file:px-4
//                      file:rounded-md file:border-0
//                      file:text-sm file:font-semibold
//                      file:bg-purple-500 file:text-white
//                      hover:file:bg-purple-700"
//         />
//       </div>

//       {/* 2) Analyze & Clear Buttons */}
//       <div className="flex gap-4 mb-6">
//         <button
//           onClick={analyzeImage}
//           disabled={isLoading || !selectedImage}
//           className={`py-2 px-4 rounded-md font-semibold ${
//             isLoading || !selectedImage
//               ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               : 'bg-purple-500 text-white hover:bg-purple-700'
//           }`}
//         >
//           {isLoading ? 'Analyzing...' : 'Analyze Image'}
//         </button>
//         <button
//           onClick={clearImage}
//           disabled={isLoading}
//           className={`py-2 px-4 rounded-md font-semibold ${
//             isLoading
//               ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               : 'bg-red-500 text-white hover:bg-red-700'
//           }`}
//         >
//           Clear
//         </button>
//       </div>

//       {/* 3) Display raw result (if you want) */}
//       {result && (
//         <div className="mb-4 p-4 bg-gray-800 rounded-md">
//           <pre className="text-sm text-white">
//             {JSON.stringify(result, null, 2)}
//           </pre>
//         </div>
//       )}

//       {/* 4) Error Message */}
//       {errorMessage && <p className="text-red-500">{errorMessage}</p>}

//       {/* 5) Conversation Display */}
//       <div className="bg-gray-800 p-4 rounded-md mb-4">
//         <h2 className="font-bold text-lg mb-2">Conversation</h2>
//         {conversation.length === 0 ? (
//           <p className="text-gray-400 italic">No messages yet.</p>
//         ) : (
//           <ul>
//             {conversation.map((msg, idx) => (
//               <li key={idx} className="mb-2">
//                 <strong>{msg.role === 'user' ? 'You:' : 'GPT:'}</strong>{' '}
//                 {msg.content}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* 6) Send Message Input */}
//       <div className="flex items-center gap-2">
//         <input
//           type="text"
//           className="flex-grow p-2 text-black rounded-md"
//           placeholder="Ask or respond..."
//           value={messageInput}
//           onChange={(e) => setMessageInput(e.target.value)}
//         />
//         <button
//           onClick={handleSendMessage}
//           className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-700"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default CreatePostPage;















