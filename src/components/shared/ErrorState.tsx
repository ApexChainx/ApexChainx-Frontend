type Props = {
  error: {
    message: string;
    correlationId?: string;
  };
};

export function ErrorState({ error }: Props) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 space-y-2">
      <p className="text-sm font-medium text-red-700">
        {error.message}
      </p>

      {error.correlationId && (
        <p className="text-xs text-red-500">
          Ref ID:{" "}
          <span className="font-mono">
            {error.correlationId}
          </span>
        </p>
      )}
    </div>
  );
}