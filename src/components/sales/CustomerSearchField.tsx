import React, { useEffect, useId, useRef, useState } from 'react';
import { Customer } from '../../types';
import { customerService } from '../../services/customerService';
import { formatNaira } from '../../utils/formatters';

const normalizeName = (name: string) => name.trim().toLowerCase();

export function CustomerSearchField({ onSelect, disabled = false, initialCustomer = null }: {
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
  initialCustomer?: Customer | null;
}) {
  const id = useId();
  const [query, setQuery] = useState(initialCustomer?.name || '');
  const [selected, setSelected] = useState(Boolean(initialCustomer));
  const [matches, setMatches] = useState<Customer[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const creationLock = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = ++version.current;
    if (selected || !query.trim()) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const timer = window.setTimeout(async () => {
      try {
        const result = await customerService.searchForSale(query, () => version.current === current);
        if (version.current !== current) return;
        setMatches(result);
        setStatus('ready');
      } catch {
        if (version.current !== current) return;
        setError('Customer search failed. Retry before creating a customer.');
        setStatus('error');
      }
    }, 250);
    return () => { window.clearTimeout(timer); version.current += 1; };
  }, [query, selected, retry]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, id]);

  const exact = matches.filter(customer => normalizeName(customer.name) === normalizeName(query));
  const canCreate = status === 'ready' && !!query.trim() && exact.length === 0 && !selected && !creating;
  const options = status === 'ready' && !selected ? matches : [];
  const optionCount = options.length + (canCreate ? 1 : 0);

  const choose = (customer: Customer) => {
    if (disabled || creationLock.current || customer.status !== 'Active') return;
    version.current += 1;
    setQuery(customer.name);
    setSelected(true);
    setOpen(false);
    setActive(-1);
    onSelect(customer);
    input.current?.focus();
  };

  const create = async () => {
    if (!canCreate || disabled || creationLock.current) return;
    creationLock.current = true;
    setCreating(true);
    setActive(-1);
    const current = ++version.current;
    const name = query.trim();
    try {
      const fresh = await customerService.searchForSale(name, () => version.current === current);
      if (version.current !== current) return;
      setMatches(fresh);
      if (fresh.some(customer => normalizeName(customer.name) === normalizeName(name))) {
        setStatus('ready');
        setOpen(true);
        return;
      }
      const response = await customerService.createCustomer({ name });
      if (version.current !== current) return;
      if (!response.success || !response.data?.id) throw new Error('Customer was not saved.');
      setQuery(response.data.name);
      setSelected(true);
      setOpen(false);
      onSelect(response.data);
    } catch {
      if (version.current !== current) return;
      setStatus('error');
      setError('Unable to create customer. Search again before retrying; the customer may already be saved.');
    } finally {
      creationLock.current = false;
      setCreating(false);
    }
  };

  return <div className="relative" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(-1); }
  }}>
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">Search or create customer</label>
    <input ref={input} id={id} role="combobox" aria-autocomplete="list"
      aria-expanded={open && optionCount > 0} aria-controls={`${id}-list`}
      aria-activedescendant={open && active >= 0 && active < optionCount ? `${id}-option-${active}` : undefined}
      aria-describedby={`${id}-status`} autoComplete="off" maxLength={150}
      value={query} disabled={disabled} readOnly={creating} aria-busy={creating} placeholder="Type a customer name or phone"
      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
      onFocus={() => setOpen(true)}
      onChange={event => {
        version.current += 1;
        setQuery(event.target.value); setSelected(false); onSelect(null);
        setMatches([]); setError(''); setStatus(event.target.value.trim() ? 'loading' : 'idle');
        setOpen(true); setActive(-1);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          if (optionCount) setActive(index => event.key === 'ArrowDown'
            ? (index + 1) % optionCount : (index <= 0 ? optionCount - 1 : index - 1));
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (open && active >= 0 && active < optionCount) {
            if (active === options.length) void create(); else choose(options[active]);
          }
        }
      }} />
    <p id={`${id}-status`} role="status" className="text-xs text-slate-600 mt-1">
      {creating ? 'Saving customer…' : status === 'loading' ? 'Searching customers…' : status === 'error' ? error
        : selected ? 'Customer selected.' : exact.length > 1 ? 'Multiple customers share this name. Select the correct customer.'
        : exact.length ? 'Select the existing customer. Inactive customers must be reactivated by an administrator.'
        : query.trim() && status === 'ready' ? `${matches.length} matches. Select a customer or create this name.` : 'Type to search existing customers.'}
    </p>
    {status === 'error' && <button type="button" disabled={creating || disabled} className="text-sm text-blue-700 underline"
      onClick={() => { setStatus('loading'); setError(''); setRetry(value => value + 1); setOpen(true); }}>Retry search</button>}
    {open && optionCount > 0 && <ul id={`${id}-list`} role="listbox" aria-label="Customers"
      className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg bg-white mt-1">
      {options.map((customer, index) => <li key={customer.id} id={`${id}-option-${index}`}
        role="option" aria-selected={active === index} aria-disabled={customer.status !== 'Active' || creating}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(customer)}
        className={`p-2 text-sm cursor-pointer ${active === index ? 'bg-blue-100' : ''} ${customer.status !== 'Active' ? 'opacity-60' : ''}`}>
        <span className="font-semibold">{customer.name}</span>{customer.phone ? ` · ${customer.phone}` : ''}
        <span className="block text-xs">Balance: {formatNaira(customer.outstandingDebt)} · Customer #{customer.id}{customer.status !== 'Active' ? ' · Inactive' : ''}</span>
      </li>)}
      {canCreate && <li id={`${id}-option-${options.length}`} role="option" aria-selected={active === options.length}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(options.length)} onClick={() => void create()}
        className={`p-2 text-sm font-semibold text-blue-700 cursor-pointer ${active === options.length ? 'bg-blue-100' : ''}`}>
        Create "{query.trim()}"
      </li>}
    </ul>}
  </div>;
}
