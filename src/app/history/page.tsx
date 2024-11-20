'use client'
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUploadHistory } from '@/lib/hooks/useUploadHistory';

export default function History() {
  const { user } = useAuth();
  const { records, isLoading, isDeleting, handleDelete } = useUploadHistory(user);
  const [currentPage, setCurrentPage] = useState(1);
  
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  console.log('Upload history records:', records);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-2xl shadow-lg max-w-3xl w-full mx-4">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload History</h1>
        {records.length === 0 ? (
          <p className="text-center text-gray-500">No records found</p>
        ) : (
          <>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Image</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Upload Time</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record) => (
                  <tr key={record.upload_id} className={isDeleting === record.upload_id ? 'opacity-50' : ''}>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2">
                      ${record.price}
                    </td>
                    <td className="px-4 py-2">
                      {record.description}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(record.upload_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
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