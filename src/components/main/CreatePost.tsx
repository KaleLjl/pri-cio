'use client';

import { useImageCaptureGoogle } from '@/lib/hooks/useCreatePost';

const ImageCaptureGoogle = () => {
  const {
    selectedImage,
    isLoading,
    result,
    errorMessage,
    uploadImage,
    analyzeImage,
    clearImage,
  } = useImageCaptureGoogle();

  return (
    <div style={{ padding: '20px', color: 'white'}}>
      <h1>Test Google API</h1>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) {
            uploadImage(e.target.files[0]);
          }
        }}
      />
      <button onClick={analyzeImage} disabled={isLoading || !selectedImage} style={{color: 'white'}}>
        {isLoading ? 'Analyzing...' : 'Analyze Image'}
      </button>
      <button onClick={clearImage} disabled={isLoading} style={{color: 'white'}}>
        Clear
      </button>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
    </div>
  );
};

export default ImageCaptureGoogle;



