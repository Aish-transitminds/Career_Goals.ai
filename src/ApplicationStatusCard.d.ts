import React from 'react';

export interface ApplicationStatusCardItem {
  id: string | number;
  university: string;
  programme: string;
  status: 'changed' | 'verified' | 'progress';
}

export interface ApplicationStatusCardProps {
  items?: ApplicationStatusCardItem[];
  cycle?: number | string;
  auditorActive?: boolean;
  provenance?: string;
}

export default function ApplicationStatusCard(props: ApplicationStatusCardProps): React.JSX.Element;
