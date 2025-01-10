interface ModalProps {
    title: string;
    message?: string;
    children?: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    confirmText: string;
    cancelText: string;
  }
  
  export default function Modal({
    title,
    message,
    children,
    isOpen,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  }: ModalProps) {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-black">{title}</h2>
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          {children && <div className="mb-6">{children}</div>}
        </div>
      </div>
    );
  }