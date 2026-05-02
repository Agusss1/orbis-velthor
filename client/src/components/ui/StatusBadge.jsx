const configs = {
  DRAFT: { cls: 'badge-gray', label: 'Draft' },
  IN_PROGRESS: { cls: 'badge-blue', label: 'In Progress' },
  APPROVED: { cls: 'badge-green', label: 'Approved' },
  REJECTED: { cls: 'badge-red', label: 'Rejected' },
  ACTIVE: { cls: 'badge-green', label: 'Active' },
  CLOSED: { cls: 'badge-gray', label: 'Closed' },
  OWNER: { cls: 'badge-yellow', label: 'Owner' },
  SUPER_ADMIN: { cls: 'badge-red', label: 'Super Admin' },
  POLITICAL_COORDINATOR: { cls: 'badge-blue', label: 'Coordinator' },
  AREA_MANAGER: { cls: 'badge-green', label: 'Area Manager' },
  LEGISLATOR: { cls: 'badge-purple', label: 'Legislator' },
  BASIC_USER: { cls: 'badge-gray', label: 'User' },
};

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { cls: 'badge-gray', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}
