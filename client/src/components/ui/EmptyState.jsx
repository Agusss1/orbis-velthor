export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-4"><Icon size={24} className="text-gray-500" /></div>}
      <h3 className="font-medium text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}
