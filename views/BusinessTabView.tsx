import React from 'react';
import { Business } from '../lib/types';
import BusinessCard from '../components/BusinessCard';

interface BusinessTabViewProps {
  businesses: Business[];
  onOpenBusiness: (biz: Business) => void;
}

// Simplified view just listing businesses using existing BusinessCard API (biz, onOpen)
export const BusinessTabView: React.FC<BusinessTabViewProps> = ({ businesses, onOpenBusiness }) => {
  return (
    <div className="space-y-4">
      {businesses.map(b => (
        <BusinessCard key={b.email || b.name} biz={b} onOpen={onOpenBusiness} />
      ))}
    </div>
  );
};
