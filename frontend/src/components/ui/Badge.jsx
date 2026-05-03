const variants = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const statusMap = {
  draft: 'gray',
  in_progress: 'blue',
  approved: 'green',
  rejected: 'red',
  archived: 'gray',
  active: 'green',
  closed: 'red',
  owner: 'yellow',
  super_admin: 'purple',
  political_coordinator: 'blue',
  area_manager: 'green',
  legislator: 'cyan',
  basic_user: 'gray',
};

export default function Badge({ label, variant, status }) {
  const v = variant || statusMap[status] || 'gray';
  return (
    <span className={`badge border ${variants[v]}`}>
      {label || status?.replace('_', ' ')}
    </span>
  );
}
