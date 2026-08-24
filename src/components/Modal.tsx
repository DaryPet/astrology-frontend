import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalViewport } from '../hooks/useModalViewport';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  wide?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, wide, ariaLabel, children }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useModalViewport(isOpen);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const previous = document.activeElement;
    returnFocusRef.current = previous instanceof HTMLElement ? previous : null;

    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialog)?.focus({ preventScroll: true });

    return () => {
      const target = returnFocusRef.current;
      if (target && target.isConnected) {
        target.focus({ preventScroll: true });
      }
      returnFocusRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="ui-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        className={wide ? 'ui-modal ui-modal--wide' : 'ui-modal'}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
