import {
  ParkingCircle,
  Bath,
  UtensilsCrossed,
  ShieldCheck,
  Wifi,
  Landmark,
  Sparkles,
  Accessibility,
  Cross,
  CigaretteOff,
  type LucideIcon,
} from 'lucide-react';

export interface FacilityDef {
  value: string;
  label: string;
  icon: LucideIcon;
}

/** Fixed catalog of venue facilities an organizer can flag for an event. */
export const FACILITIES: FacilityDef[] = [
  { value: 'parking', label: 'Parking', icon: ParkingCircle },
  { value: 'bathrooms', label: 'Bathrooms', icon: Bath },
  { value: 'food_drinks', label: 'Food & drinks', icon: UtensilsCrossed },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'atm', label: 'ATM', icon: Landmark },
  { value: 'prayer_room', label: 'Prayer room', icon: Sparkles },
  { value: 'accessibility', label: 'Wheelchair accessible', icon: Accessibility },
  { value: 'first_aid', label: 'First aid', icon: Cross },
  { value: 'smoking_area', label: 'Smoking area', icon: CigaretteOff },
];

export function getFacilityDef(value: string): FacilityDef | undefined {
  return FACILITIES.find((f) => f.value === value);
}
