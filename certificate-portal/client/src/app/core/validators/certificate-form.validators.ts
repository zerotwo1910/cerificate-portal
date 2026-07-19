import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Reusable regex-based validators for the Certificate Generation form.
 * Kept separate from the component so they stay easy to unit test and reuse.
 */
export class CertificateFormValidators {
  /** Letters, spaces, and a period only (e.g. "R. Sowmiya Sri"). */
  static readonly recipientNamePattern = /^[A-Za-z. ]+$/;

  /** Alphanumeric only, no spaces or symbols. */
  static readonly registerNumberPattern = /^[A-Za-z0-9]+$/;

  /** Letters, numbers, @, ., _ and - only — a slightly stricter email shape. */
  static readonly emailAllowedCharsPattern = /^[A-Za-z0-9@._-]+$/;

  static recipientName(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '').toString();
      if (!value) return null;
      return CertificateFormValidators.recipientNamePattern.test(value)
        ? null
        : { invalidCharacters: 'Only letters, spaces, and periods are allowed.' };
    };
  }

  static registerNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '').toString();
      if (!value) return null;
      return CertificateFormValidators.registerNumberPattern.test(value)
        ? null
        : { invalidCharacters: 'Only letters and numbers are allowed.' };
    };
  }

  static emailAllowedChars(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '').toString();
      if (!value) return null;
      return CertificateFormValidators.emailAllowedCharsPattern.test(value)
        ? null
        : { invalidCharacters: 'Only letters, numbers, @ . _ - are allowed.' };
    };
  }
}
