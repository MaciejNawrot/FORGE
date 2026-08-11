import type { ReactNode } from 'react';
import type { Equipment } from '@/lib/exercise-library';

const paths: Record<Equipment, ReactNode> = {
  barbell: (
    <>
      <rect x="2" y="8" width="3" height="8" rx="1" />
      <rect x="19" y="8" width="3" height="8" rx="1" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="4" y="9" width="3" height="6" rx="1" />
      <rect x="17" y="9" width="3" height="6" rx="1" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </>
  ),
  bodyweight: (
    <>
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="15" />
      <line x1="12" y1="9" x2="7" y2="13" />
      <line x1="12" y1="9" x2="17" y2="13" />
      <line x1="12" y1="15" x2="8" y2="21" />
      <line x1="12" y1="15" x2="16" y2="21" />
    </>
  ),
  machine: (
    <>
      <rect x="4" y="4" width="10" height="16" rx="1" />
      <circle cx="18" cy="8" r="2" />
      <line x1="18" y1="10" x2="18" y2="16" />
    </>
  ),
  cable: (
    <>
      <circle cx="12" cy="4" r="2" />
      <line x1="12" y1="6" x2="12" y2="16" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </>
  ),
};

function isKnownEquipment(value: string): value is Equipment {
  return value in paths;
}

export function EquipmentIcon({ equipment, className }: { equipment: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[isKnownEquipment(equipment) ? equipment : 'dumbbell']}
    </svg>
  );
}
