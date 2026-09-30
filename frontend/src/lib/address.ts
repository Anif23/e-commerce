/**
 * Address helpers shared by the checkout form and the account address book.
 * Kept out of the component file so fast refresh keeps working.
 */

import type { Address } from '../types/api';

export type AddressDraft = {
  label?: string;
  fullName: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault?: boolean;
  save?: boolean;
};

/** States and union territories the store ships to. */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const EMPTY_ADDRESS: AddressDraft = {
  label: '',
  fullName: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  country: 'India',
  zipCode: '',
  isDefault: false,
};

export const toDraft = (address?: Address | null): AddressDraft =>
  address
    ? {
        label: address.label ?? '',
        fullName: address.fullName,
        phone: address.phone,
        address1: address.address1,
        address2: address.address2 ?? '',
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
        isDefault: address.isDefault,
      }
    : { ...EMPTY_ADDRESS };
