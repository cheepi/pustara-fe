export type ThemeOption = 'dark' | 'light';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}
