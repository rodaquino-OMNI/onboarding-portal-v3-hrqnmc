/**
 * useNotification Hook Tests
 * Test coverage for notification hook
 */

import { renderHook } from '@testing-library/react';
import { useNotification } from '../useNotification';
import * as NotificationContextModule from '../../contexts/NotificationContext';

// Mock the NotificationContext
const mockShowNotification = jest.fn();
const mockRemoveNotification = jest.fn();
const mockClearAll = jest.fn();

jest.mock('../../contexts/NotificationContext', () => ({
  ...jest.requireActual('../../contexts/NotificationContext'),
  useNotificationContext: jest.fn(() => ({
    showNotification: mockShowNotification,
    removeNotification: mockRemoveNotification,
    clearAll: mockClearAll,
    notifications: []
  }))
}));

describe('useNotification Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowNotification.mockReturnValue('notification-id-123');
  });

  describe('showSuccess', () => {
    it('should show success notification', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showSuccess('Operation successful');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Operation successful',
        expect.objectContaining({
          severity: 'success'
        })
      );
    });

    it('should return notification ID', () => {
      const { result } = renderHook(() => useNotification());

      const id = result.current.showSuccess('Success message');

      expect(id).toBe('notification-id-123');
    });

    it('should warn and return empty string for empty message', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useNotification());

      const id = result.current.showSuccess('');

      expect(consoleSpy).toHaveBeenCalledWith('Success notification message cannot be empty');
      expect(id).toBe('');
      consoleSpy.mockRestore();
    });

    it('should accept custom config', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showSuccess('Success', { duration: 10000 });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Success',
        expect.objectContaining({
          duration: 10000
        })
      );
    });
  });

  describe('showError', () => {
    it('should show error notification', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showError('An error occurred');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'An error occurred',
        expect.objectContaining({
          severity: 'error'
        })
      );
    });

    it('should use assertive aria-live for errors', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showError('Error message');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Error message',
        expect.objectContaining({
          'aria-live': 'assertive',
          role: 'alert'
        })
      );
    });

    it('should log error and return empty string for empty message', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useNotification());

      const id = result.current.showError('  ');

      expect(consoleSpy).toHaveBeenCalled();
      expect(id).toBe('');
      consoleSpy.mockRestore();
    });
  });

  describe('showWarning', () => {
    it('should show warning notification', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showWarning('Warning message');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Warning message',
        expect.objectContaining({
          severity: 'warning'
        })
      );
    });

    it('should preserve warnings on route change', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showWarning('Important warning');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Important warning',
        expect.objectContaining({
          preserveOnRouteChange: true
        })
      );
    });

    it('should warn for empty message', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useNotification());

      result.current.showWarning('');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('showInfo', () => {
    it('should show info notification', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showInfo('Information message');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Information message',
        expect.objectContaining({
          severity: 'info'
        })
      );
    });

    it('should use polite aria-live for info', () => {
      const { result } = renderHook(() => useNotification());

      result.current.showInfo('Info');

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Info',
        expect.objectContaining({
          'aria-live': 'polite',
          role: 'status'
        })
      );
    });
  });

  describe('removeNotification', () => {
    it('should expose removeNotification function', () => {
      const { result } = renderHook(() => useNotification());

      result.current.removeNotification('notification-id');

      expect(mockRemoveNotification).toHaveBeenCalledWith('notification-id');
    });
  });

  describe('clearAll', () => {
    it('should expose clearAll function', () => {
      const { result } = renderHook(() => useNotification());

      result.current.clearAll();

      expect(mockClearAll).toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('should expose notifications array', () => {
      const { result } = renderHook(() => useNotification());

      expect(result.current.notifications).toEqual([]);
    });
  });
});
