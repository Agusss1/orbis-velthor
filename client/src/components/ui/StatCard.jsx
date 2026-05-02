export default function StatCard({ title, value, icon: Icon, change, color = 'blue' }) {
  const colors = {
    blue: 'bg-orbis-600/20 text-orbis-400',
    green: 'bg-emerald-600/20 text-emerald-400',
    yellow: 'bg-amber-600/20 text-amber-400',
    red: 'bg-red-600/20 text-red-400',
    purple: 'bg-purple-600/20 text-purple-400',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-100">{value ?? '—'}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change}% vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
