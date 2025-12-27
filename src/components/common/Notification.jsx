function Notification({ type = 'info', title, message, onClose }) {
  const typeStyles = {
    info: 'bg-blue-100 border-blue-400 text-blue-800',
    success: 'bg-green-100 border-green-400 text-green-800',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    error: 'bg-red-100 border-red-400 text-red-800',
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`fixed top-4 right-4 p-4 border-l-4 rounded-r-lg shadow-lg ${typeStyles[type]} z-50 min-w-80`}>
      <div className="flex items-start">
        <span className="text-xl mr-3">{typeIcons[type]}</span>
        <div className="flex-1">
          {title && <h4 className="font-semibold">{title}</h4>}
          <p className="text-sm mt-1">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Notification;