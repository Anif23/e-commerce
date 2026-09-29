import { useState } from 'react';

import { Checkbox, Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';
import type { Address } from '../../types/api';

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

const EMPTY: AddressDraft = {
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
    : { ...EMPTY };

/**
 * Address fields shared by checkout and the account address book.
 * Passwords of validation live on the server; the browser only blocks empty
 * required fields so the user gets instant feedback.
 */
export const AddressForm = ({
  initial,
  submitLabel = 'Save address',
  showSaveToggle = false,
  loading,
  onSubmit,
  onCancel,
}: {
  initial?: AddressDraft;
  submitLabel?: string;
  showSaveToggle?: boolean;
  loading?: boolean;
  onSubmit: (draft: AddressDraft) => void;
  onCancel?: () => void;
}) => {
  const [draft, setDraft] = useState<AddressDraft>(initial ?? { ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof AddressDraft) => (value: string | boolean) =>
    setDraft((current) => ({ ...current, [key]: value }) as AddressDraft);

  const validate = () => {
    const next: Record<string, string> = {};

    if (draft.fullName.trim().length < 2) next.fullName = 'Enter the recipient name';
    if (!/^(\+?91[-\s]?)?[6-9]\d{9}$/.test(draft.phone.replace(/[\s-]/g, '')))
      next.phone = 'Enter a valid 10-digit Indian mobile number';
    if (draft.address1.trim().length < 3) next.address1 = 'Enter the street address';
    if (draft.city.trim().length < 2) next.city = 'Enter a city';
    if (draft.state.trim().length < 2) next.state = 'Enter a state or region';
    if (!/^\d{6}$/.test(draft.zipCode.trim())) next.zipCode = 'Enter a valid 6-digit PIN code';
    if (draft.country.trim().length < 2) next.country = 'Enter a country';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (validate()) onSubmit(draft);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          required
          value={draft.fullName}
          error={errors.fullName}
          onChange={(event) => set('fullName')(event.target.value)}
        />
        <Input
          label="Phone"
          required
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          hint="10-digit Indian mobile number"
          value={draft.phone}
          error={errors.phone}
          onChange={(event) => set('phone')(event.target.value)}
        />
      </div>

      <Input
        label="Address line 1"
        required
        value={draft.address1}
        error={errors.address1}
        onChange={(event) => set('address1')(event.target.value)}
      />

      <Input
        label="Address line 2"
        hint="Apartment, suite, unit — optional"
        value={draft.address2 ?? ''}
        onChange={(event) => set('address2')(event.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="City" required value={draft.city} error={errors.city} onChange={(e) => set('city')(e.target.value)} />
        <Select
          label="State"
          required
          placeholder="Select a state"
          value={draft.state}
          error={errors.state}
          options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
          onChange={(event) => set('state')(event.target.value)}
        />
        <Input
          label="PIN code"
          required
          inputMode="numeric"
          maxLength={6}
          placeholder="628001"
          value={draft.zipCode}
          error={errors.zipCode}
          onChange={(event) => set('zipCode')(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
      </div>

      <Input label="Country" required readOnly value={draft.country} error={errors.country} onChange={(e) => set('country')(e.target.value)} />

      {showSaveToggle ? (
        <Checkbox
          label="Save this address to my account"
          checked={Boolean(draft.save)}
          onChange={(checked) => set('save')(checked)}
        />
      ) : (
        <Checkbox
          label="Use as my default address"
          checked={Boolean(draft.isDefault)}
          onChange={(checked) => set('isDefault')(checked)}
        />
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
