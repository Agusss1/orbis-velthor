export default function LoadingSpinner({ size = 'md', centered = false }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  const spinner = <div className={`animate-spin ${s} border-2 border-orbis-500 border-t-transparent rounded-full`} />;
  if (centered) return <div className="flex items-center justify-center p-8">{spinner}</div>;
  return spinner;
}
