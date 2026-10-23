export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="feedback error" role="alert">
      {message}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading…
    </div>
  );
}
