'use client'
import { useAuth } from '@/lib/hooks/useAuth';
import { useUploadHistory } from '@/lib/hooks/useUploadHistory';

export default function History() {
  const { user } = useAuth();
  const { records, isLoading, isDeleting, handleDelete } = useUploadHistory(user);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  console.log('Upload history records:', records);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload History</h1>
      {records.length === 0 ? (
        <p className="text-center text-gray-500">No records found</p>
      ) : (
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2">Image</th>
              <th className="px-4 py-2">Upload Time</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
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
      )}
    </div>
  );
}