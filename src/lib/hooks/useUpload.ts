import { useState } from 'react'

interface ProductData {
  images: {
    file: File
    preview: string
  }[]
  price: string
  description: string
}

export const useUpload = () => {
  const [product, setProduct] = useState<ProductData>({
    images: [],
    price: '',
    description: ''
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setProduct(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }))
  }

  const updateProductDetails = (field: 'price' | 'description', value: string) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const removeImage = (index: number) => {
    setProduct(prev => {
      const updatedImages = [...prev.images]
      URL.revokeObjectURL(updatedImages[index].preview)
      updatedImages.splice(index, 1)
      return {
        ...prev,
        images: updatedImages
      }
    })
  }

  const handleUpload = async () => {
    try {
      setIsUploading(true)
      const formData = new FormData()
      
      product.images.forEach((image, index) => {
        formData.append(`images`, image.file)
      })
      formData.append('price', product.price)
      formData.append('description', product.description)

      // Add your API call here
      // await fetch('/api/upload', { method: 'POST', body: formData })

      setProduct({
        images: [],
        price: '',
        description: ''
      })
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return {
    product,
    isUploading,
    handleFileSelect,
    updateProductDetails,
    removeImage,
    handleUpload
  }
}
