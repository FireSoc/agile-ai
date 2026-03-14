import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorAlert({ message = 'Something went wrong.', onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="mt-0.5 text-sm text-red-600">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-ghost text-red-600 hover:bg-red-100 flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
