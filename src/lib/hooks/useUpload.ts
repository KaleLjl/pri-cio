import { useState } from 'react'
import { CURRENCIES, type Currency } from '@/components/main/App'

interface ProductData {
  images: {
    file: File
    preview: string
  }[]
  price: string
  description: string
  currency: string
}

export const useUpload = () => {
  const [product, setProduct] = useState<ProductData>({
    images: [],
    price: '',
    description: '',
    currency: 'USD'
  })
  const [isUploading, setIsUploading] = useState(false)
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([])
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    setErrorMessage('')

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setProduct(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }))
  }

  const updateProductDetails = (field: 'price' | 'description' | 'currency', value: string) => {
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

  const analyzeImageWithAI = async () => {
    try {
      setIsUploading(true)
      // TODO: Implement AI analysis
      // This should call your AI endpoint to analyze the image
      // and suggest price and description
      
      // Mock response for now
      const aiResponse = {
        price: "299.99",
        description: "AI suggested description for the product"
      }

      setProduct(prev => ({
        ...prev,
        price: aiResponse.price,
        description: aiResponse.description
      }))

      setConversation(prev => [...prev, 
        { role: 'system', content: 'Image analyzed successfully' },
        { role: 'assistant', content: `Suggested price: ${aiResponse.price}\nDescription: ${aiResponse.description}` }
      ])
    } catch (error) {
      setErrorMessage('Failed to analyze image')
      console.error('Analysis failed:', error)
    } finally {
      setIsUploading(false)
    }
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
      formData.append('currency', product.currency)

      // Add your API call here
      // await fetch('/api/upload', { method: 'POST', body: formData })

      setProduct({
        images: [],
        price: '',
        description: '',
        currency: 'USD'
      })
      setConversation([])
    } catch (error) {
      setErrorMessage('Upload failed')
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const clearAll = () => {
    product.images.forEach(image => URL.revokeObjectURL(image.preview))
    setProduct({
      images: [],
      price: '',
      description: '',
      currency: 'USD'
    })
    setConversation([])
    setErrorMessage('')
  }

  return {
    product,
    isUploading,
    conversation,
    errorMessage,
    handleFileSelect,
    updateProductDetails,
    removeImage,
    analyzeImageWithAI,
    handleUpload,
    clearAll
  }
}
