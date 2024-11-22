'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUploadHistory } from '@/lib/hooks/useUploadHistory';

export default function History() {
  const { user } = useAuth();
  const { records, isLoading, isFetching, isDeleting, handleDelete, refetch } = useUploadHistory(user);
  const [currentPage, setCurrentPage] = useState(1);
  
  // 添加 useEffect 在页面加载时触发刷新
  useEffect(() => {
    refetch();
  }, [refetch, user]);

  // 固定每页显示10条记录
  const itemsPerPage = 10;
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const currentRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 生成页码数组
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // 最多显示5个页码按钮

    if (totalPages <= maxVisiblePages) {
      // 如果总页数小于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 如果总页数大于5，显示当前页附近的页码
      let startPage = Math.max(currentPage - 2, 1);
      let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(endPage - maxVisiblePages + 1, 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-2xl shadow-lg max-w-3xl w-full mx-4">
          <h1 className="text-2xl font-bold mb-4 text-center">History</h1>
          <div className="w-full space-y-4">
            {[...Array(3)].map((_, index) => (
              <div 
                key={index}
                className="animate-pulse flex items-center bg-purple-50/80 p-4 rounded-lg"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="w-16 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  console.log('Upload history records:', records);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-2xl shadow-lg max-w-3xl w-full mx-4">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-800">History</h1>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-600 bg-blue-50 dark:bg-blue-50 px-2.5 py-0.5 rounded-full">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Refreshing
            </span>
          )}
        </div>
        {records.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-500">No records found</p>
        ) : (
          <>
            <table className="min-w-full border-separate border-spacing-y-3">
              <tbody>
                {currentRecords.map((record) => (
                  <tr 
                    key={record.upload_id} 
                    className={`
                      ${isDeleting === record.upload_id ? 'opacity-50' : ''}
                      bg-purple-50/80
                      backdrop-blur-sm 
                      hover:bg-purple-100/90
                      transition-all duration-200
                      shadow-sm
                      rounded-lg
                    `}
                  >
                    <td className="px-4 py-3 rounded-l-lg">
                      <img 
                        src={record.image_data}
                        alt="Uploaded" 
                        className="w-20 h-20 object-cover"
                        style={{ width: 'auto', height: 'auto', maxWidth: '80px', maxHeight: '80px' }}
                        onError={(e) => {
                          console.error('Image loading error');
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xl text-gray-800 dark:text-gray-800">
                        ${record.price}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-800">
                      {record.description}
                    </td>
                    <td className="px-4 py-3 rounded-r-lg">
                      <button
                        onClick={() => handleDelete(record.upload_id)}
                        disabled={isDeleting === record.upload_id}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        {isDeleting === record.upload_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 优化后的分页控件 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  First
                </button>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Next
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Last
                </button>

                <span className="text-gray-600 ml-2">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}