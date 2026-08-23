import React, { useRef } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../../types';

interface GeneralInfoSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
  errors: Record<string, string>;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
  formData,
  onChange,
  role,
  errors,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = role === 'cashier';

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Image only & max 2MB
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP, or SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must not exceed 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange('logo', event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onChange('logo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Pharmacy Identity & Contact Details</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure the legal business name, contact information, and logo that appear across reports and receipts.
          </p>
        </div>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </span>
        )}
      </div>

      {/* Grid of Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pharmacy Name */}
        <div className="md:col-span-2">
          <label htmlFor="settings-pharmacy-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Pharmacy / Store Legal Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="settings-pharmacy-name"
              type="text"
              disabled={isReadOnly}
              value={formData.pharmacyName}
              onChange={(e) => onChange('pharmacyName', e.target.value)}
              placeholder="e.g. Al-Amaan Medicine Store"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${
                errors.pharmacyName ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.pharmacyName && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.pharmacyName}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="settings-pharmacy-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Telephone / Hotline
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="settings-pharmacy-phone"
              type="tel"
              disabled={isReadOnly}
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="e.g. 0803 456 7890"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="settings-pharmacy-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Official Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="settings-pharmacy-email"
              type="email"
              disabled={isReadOnly}
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="e.g. info@alamaanmedicine.ng"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Physical Address */}
        <div className="md:col-span-2">
          <label htmlFor="settings-pharmacy-address" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Physical Operating Address & Location
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <textarea
              id="settings-pharmacy-address"
              rows={2}
              disabled={isReadOnly}
              value={formData.address}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="e.g. Plot 14 Commercial Avenue, Sabon Gari, Kano, Nigeria"
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            />
          </div>
        </div>

        {/* Business Description / PCN License */}
        <div className="md:col-span-2">
          <label htmlFor="settings-pharmacy-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Business Tagline & PCN Registration Details
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="settings-pharmacy-desc"
              type="text"
              disabled={isReadOnly}
              value={formData.businessDescription}
              onChange={(e) => onChange('businessDescription', e.target.value)}
              placeholder="e.g. Licensed Community & Retail Pharmacy Dispensing Services (PCN Reg: KN-2041)"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Pharmacy Logo Upload & Preview */}
      <div className="pt-4 border-t border-slate-200">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Pharmacy Logo Branding
        </label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl border border-slate-200 bg-slate-50">
          {/* Logo Visual Frame */}
          <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
            {formData.logo ? (
              <img
                src={formData.logo}
                alt="Pharmacy Logo"
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 text-center p-2">
                <ImageIcon className="w-8 h-8 stroke-[1.5] mb-1" />
                <span className="text-[10px] font-medium leading-tight">No logo</span>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                id="pharmacy-logo-input"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={handleLogoUpload}
                disabled={isReadOnly}
                className="hidden"
              />
              <button
                type="button"
                id="upload-logo-btn"
                disabled={isReadOnly}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>{formData.logo ? 'Change Logo' : 'Upload Logo'}</span>
              </button>

              {formData.logo && (
                <button
                  type="button"
                  id="remove-logo-btn"
                  disabled={isReadOnly}
                  onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Recommended: PNG or SVG with transparent background (Max 2MB). Used on thermal print receipts, headers, and exported reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
