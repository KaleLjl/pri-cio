import { useUpload } from '@/lib/hooks/useUpload'
import Image from 'next/image'

export const Upload = () => {
  const {
    product,
    isUploading,
    handleFileSelect,
    updateProductDetails,
    removeImage,
    handleUpload
  } = useUpload()

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Product Images</h2>
        <div className="flex items-center justify-center w-full mb-4">
          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-4 text-gray-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 800x400px)</p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </label>
        </div>

        {/* Image Previews */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {product.images.map((image, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={image.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Product Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              type="number"
              placeholder="Enter price"
              value={product.price}
              onChange={(e) => updateProductDetails('price', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter product description"
              value={product.description}
              onChange={(e) => updateProductDetails('description', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Upload Button */}
      {product.images.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading || !product.price || !product.description}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Product'}
          </button>
        </div>
      )}
    </div>
  )
}
