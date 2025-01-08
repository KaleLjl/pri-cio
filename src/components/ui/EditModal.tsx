interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    price: string;
    description: string;
    onPriceChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
  }
  
  export default function EditModal({
    isOpen,
    onClose,
    onSave,
    price,
    description,
    onPriceChange,
    onDescriptionChange,
  }: EditModalProps) {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Edit Item</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input
                type="text"
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }