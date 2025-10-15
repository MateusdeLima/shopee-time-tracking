"use client"

interface LoadingScreenProps {
  message: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col items-center justify-center z-50">
      {/* Spinner laranja igual à imagem */}
      <div className="relative mb-8">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#EE4D2D] border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Texto de carregamento */}
      <p className="text-xl font-medium text-gray-800">{message}</p>
    </div>
  )
}
