import React from 'react';
import { RequestStatus } from '../types';

interface BadgeProps {
  status: RequestStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'Done': 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};